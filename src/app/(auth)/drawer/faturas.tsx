import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  Linking,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/theme/colors';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface InvoiceDetail {
  id: string;
  orderDate: Timestamp;
  orderTotalPrice: number;
  paymentMethod: string;
  percentage: number;
  value: number;
}

interface PaymentData {
  qr_code?: string;
  qr_code_base64?: string;
  ticket_url?: string;
}

interface PaymentInfo {
  paymentUrl?: string;
  qrCodeBase64?: string;
  boletoUrl?: string;
}

interface Invoice {
  id: string;
  partnerId: string;
  startDate: Timestamp;
  endDate: Timestamp;
  createdAt: Timestamp;
  totalAmount: number;
  status: 'pending' | 'paid' | 'overdue';
  details: InvoiceDetail[];
  paymentId?: string;
  paymentMethod?: 'pix' | 'boleto';
  paymentData: PaymentData;
  paymentInfo?: PaymentInfo;
  paidAt?: Timestamp;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (date: Timestamp | undefined): string => {
  if (!date) return '-';
  return format(date.toDate(), 'dd/MM/yyyy', { locale: ptBR });
};

const getMonthYear = (date: Timestamp | undefined): string => {
  if (!date) return '-';
  return format(date.toDate(), 'MMMM yyyy', { locale: ptBR });
};

const getStatusColor = (status: Invoice['status']): string => {
  switch (status) {
    case 'paid':
      return colors.green[500];
    case 'pending':
      return colors.orange;
    case 'overdue':
      return colors.red[500];
    default:
      return colors.gray[500];
  }
};

const getStatusText = (status: Invoice['status']): string => {
  switch (status) {
    case 'paid':
      return 'Pago';
    case 'pending':
      return 'Pendente';
    case 'overdue':
      return 'Atrasado';
    default:
      return status;
  }
};

const PaymentMethodCard = ({ 
  method, 
  selected, 
  onSelect, 
  icon, 
  title 
}: { 
  method: 'pix' | 'boleto', 
  selected: boolean, 
  onSelect: () => void,
  icon: React.ReactNode,
  title: string
}) => (
  <TouchableOpacity
    style={[
      styles.paymentMethodCard,
      selected && styles.paymentMethodCardSelected
    ]}
    onPress={onSelect}
  >
    <View style={styles.paymentMethodIcon}>
      {icon}
    </View>
    <Text style={[
      styles.paymentMethodText,
      selected && styles.paymentMethodTextSelected
    ]}>
      {title}
    </Text>
  </TouchableOpacity>
);

const InvoiceStatusBadge = ({ status }: { status: Invoice['status'] }) => (
  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) + '20' }]}>
    <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />
    <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
      {getStatusText(status)}
    </Text>
  </View>
);

const EmptyState = () => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconContainer}>
      <MaterialCommunityIcons name="file-document-outline" size={64} color={colors.orange} />
    </View>
    <Text style={styles.emptyTitle}>Nenhuma fatura encontrada</Text>
    <Text style={styles.emptyDescription}>
      Suas faturas aparecerão aqui assim que você começar a receber pedidos.
    </Text>
  </View>
);

export default function Faturas() {
  const [isLoading, setIsLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'boleto'>('pix');
  const [isGeneratingPayment, setIsGeneratingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  const functions = getFunctions();

  useEffect(() => {
    if (!user?.uid) return;

    const invoicesRef = collection(db, 'partners', user.uid, 'invoices');
    const q = query(invoicesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      console.log('Recebida atualização em tempo real das faturas');
      
      const loadedInvoices = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data();
          const invoice: Invoice = {
            id: doc.id,
            partnerId: user.uid,
            startDate: data.startDate || data.createdAt,
            endDate: data.endDate || data.createdAt,
            createdAt: data.createdAt,
            totalAmount: data.totalAmount || 0,
            status: data.status || 'pending',
            details: data.details || [],
            paymentId: data.paymentId,
            paymentMethod: data.paymentMethod,
            paymentData: data.paymentData || {},
            paymentInfo: data.paymentInfo,
            paidAt: data.paidAt
          };
          return invoice;
        })
      );
      
      setInvoices(loadedInvoices);
      
      // Atualiza a fatura atual se necessário
      const currentInvoiceData = loadedInvoices.find(inv => 
        inv.status === 'pending' || 
        (currentInvoice && inv.id === currentInvoice.id)
      );
      
      if (currentInvoiceData) {
        console.log('Atualizando fatura atual:', currentInvoiceData);
        setCurrentInvoice(currentInvoiceData);
        
        // Se a fatura foi paga, mostra mensagem de sucesso
        if (currentInvoice?.status === 'pending' && currentInvoiceData.status === 'paid') {
          Alert.alert('Pagamento Confirmado', 'Seu pagamento foi processado com sucesso!');
        }
      }
    }, (error) => {
      console.error('Erro ao monitorar faturas:', error);
    });

    // Cleanup
    return () => unsubscribe();
  }, [user]);

  const loadInvoices = async () => {
    if (!user?.uid) return;
    
    setIsLoading(true);
    try {
      console.log('Carregando faturas...');
      const invoicesRef = collection(db, 'partners', user.uid, 'invoices');
      const q = query(invoicesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const loadedInvoices = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data();
          console.log('Dados da fatura:', data);
          const invoice: Invoice = {
            id: doc.id,
            partnerId: user.uid,
            startDate: data.startDate || data.createdAt,
            endDate: data.endDate || data.createdAt,
            createdAt: data.createdAt,
            totalAmount: data.totalAmount || 0,
            status: data.status || 'pending',
            details: data.details || [],
            paymentId: data.paymentId,
            paymentMethod: data.paymentMethod,
            paymentData: data.paymentData || {},
            paymentInfo: data.paymentInfo,
            paidAt: data.paidAt
          };
          return invoice;
        })
      );
      
      setInvoices(loadedInvoices);
      const pendingInvoice = loadedInvoices.find(inv => inv.status === 'pending');
      
      if (pendingInvoice) {
        console.log('Fatura pendente encontrada:', pendingInvoice);
        setCurrentInvoice(pendingInvoice);
        
        // Se não tiver QR Code gerado, gera automaticamente
        if (!pendingInvoice.paymentData?.qr_code) {
          console.log('Iniciando geração automática do QR Code PIX...');
          setPaymentMethod('pix');
          await handleGeneratePayment(pendingInvoice);
        } else {
          console.log('QR Code já existe:', pendingInvoice.paymentData);
        }
      } else {
        setCurrentInvoice(null);
      }
    } catch (error) {
      console.error('Erro ao carregar faturas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as faturas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [user]);

  const handleInvoicePress = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDetailsModalVisible(true);
  };

  const handleGeneratePayment = async (invoice?: Invoice) => {
    const targetInvoice = invoice || currentInvoice;
    if (!targetInvoice || !user?.uid) return;
    
    setIsGeneratingPayment(true);
    setPaymentError(null);
    
    try {
      console.log('Iniciando geração de pagamento para fatura:', targetInvoice.id);
      
      // Busca os dados do parceiro
      const partnerRef = doc(db, 'partners', user.uid);
      const partnerSnap = await getDoc(partnerRef);
      const partnerData = partnerSnap.data();

      // Só valida endereço se for boleto
      if (paymentMethod === 'boleto' && !partnerData?.address) {
        throw new Error('Endereço não encontrado. Por favor, atualize seu cadastro.');
      }

      const paymentData = {
        partnerId: user.uid,
        invoiceId: targetInvoice.id,
        tipoPagamento: paymentMethod,
        ...(paymentMethod === 'boleto' && partnerData?.address ? {
          address: {
            zip_code: partnerData.address.cep.replace(/\D/g, ''),
            street_name: partnerData.address.street,
            street_number: partnerData.address.number,
            neighborhood: partnerData.address.neighborhood,
            city: partnerData.address.city,
            federal_unit: partnerData.address.state.toUpperCase(),
            complement: partnerData.address.complement || ''
          }
        } : {})
      };

      console.log('Dados do pagamento:', paymentData);

      const gerarPagamento = httpsCallable(functions, 'gerarPagamento');
      const result = await gerarPagamento(paymentData);

      if (!result.data) {
        throw new Error('Não foi possível gerar o pagamento. Tente novamente.');
      }

      console.log('Resposta do pagamento:', result.data);

      // Recarrega a fatura para obter os dados atualizados
      const invoiceRef = doc(db, 'partners', user.uid, 'invoices', targetInvoice.id);
      const updatedInvoiceSnap = await getDoc(invoiceRef);
      
      if (updatedInvoiceSnap.exists()) {
        const data = updatedInvoiceSnap.data();
        console.log('Dados atualizados da fatura:', data);
        
        if (!data.paymentInfo?.paymentUrl && !data.paymentData?.qr_code) {
          console.error('QR Code não encontrado nos dados da fatura');
          throw new Error('QR Code não gerado. Por favor, tente novamente.');
        }
        
        const updatedInvoice = {
          ...data,
          id: updatedInvoiceSnap.id,
          startDate: data?.startDate || data?.createdAt,
          endDate: data?.endDate || data?.createdAt,
          createdAt: data?.createdAt,
          paymentData: {
            qr_code: data?.paymentInfo?.paymentUrl || data?.paymentData?.qr_code,
            qr_code_base64: data?.paymentInfo?.qrCodeBase64 || data?.paymentData?.qr_code_base64,
            ticket_url: data?.paymentInfo && 'boletoUrl' in data.paymentInfo ? data.paymentInfo.boletoUrl : data?.paymentData?.ticket_url || result.data?.boletoUrl
          }
        } as Invoice;
        
        console.log('Fatura atualizada:', updatedInvoice);
        setCurrentInvoice(updatedInvoice);

        if (paymentMethod === 'boleto' && updatedInvoice.paymentData?.ticket_url) {
          Linking.openURL(updatedInvoice.paymentData.ticket_url);
        }
      }

      setPaymentModalVisible(false);
    } catch (error: any) {
      console.error('Erro ao gerar pagamento:', error);
      setPaymentError(error.message || 'Não foi possível gerar o pagamento. Tente novamente.');
      Alert.alert('Erro', error.message || 'Não foi possível gerar o pagamento. Tente novamente.');
    } finally {
      setIsGeneratingPayment(false);
    }
  };

  const handleCopyPixCode = async () => {
    if (currentInvoice?.paymentData?.qr_code) {
      await Clipboard.setStringAsync(currentInvoice.paymentData.qr_code);
      Alert.alert('Código Pix copiado!');
    }
  };

  const renderCurrentInvoiceCard = () => {
    if (!currentInvoice) return null;

    return (
      <LinearGradient
        colors={[colors.orange, colors.orange + '90']}
        style={styles.currentInvoiceCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.currentInvoiceHeader}>
          <View style={styles.currentInvoiceHeaderLeft}>
            <MaterialCommunityIcons name="file-document" size={28} color={colors.white} />
            <Text style={styles.currentInvoiceTitle}>Fatura Atual</Text>
          </View>
          <InvoiceStatusBadge status={currentInvoice.status} />
        </View>

        <View style={styles.currentInvoiceContent}>
          <Text style={styles.currentInvoiceMonth}>
            {getMonthYear(currentInvoice.startDate)}
          </Text>
          
          <View style={styles.totalContainer}>
            <View style={styles.totalHeader}>
              <MaterialCommunityIcons name="currency-usd" size={24} color={colors.white} />
              <Text style={styles.totalLabel}>Total a Pagar</Text>
            </View>
            <Text style={styles.totalValue}>
              {formatCurrency(currentInvoice.totalAmount)}
            </Text>
            <Text style={styles.currentInvoiceDueDate}>
              Vencimento: {formatDate(currentInvoice.endDate)}
            </Text>
          </View>
        </View>

        {currentInvoice.status === 'pending' && (
          <View style={styles.paymentContainer}>
            {isGeneratingPayment ? (
              <View style={styles.paymentLoadingContainer}>
                <ActivityIndicator size="large" color={colors.white} />
                <Text style={styles.loadingText}>
                  {paymentMethod === 'pix' ? 'Gerando QR Code PIX...' : 'Gerando Boleto...'}
                </Text>
              </View>
            ) : currentInvoice.paymentData?.qr_code || currentInvoice.paymentData?.qr_code_base64 ? (
              <View style={styles.qrCodeContainer}>
                <Text style={styles.qrCodeTitle}>Pague sua fatura usando PIX</Text>
                <View style={styles.qrCodeWrapper}>
                  {currentInvoice.paymentData?.qr_code_base64 ? (
                    <>
                      <Image
                        source={{ uri: `data:image/png;base64,${currentInvoice.paymentData.qr_code_base64}` }}
                        style={styles.qrCodeImage}
                        resizeMode="contain"
                      />
                      <Text style={styles.qrCodeStatus}>QR Code carregado com sucesso</Text>
                      <TouchableOpacity
                        style={styles.reloadButton}
                        onPress={() => handleGeneratePayment()}
                      >
                        <MaterialCommunityIcons name="reload" size={20} color={colors.orange} />
                        <Text style={styles.reloadButtonText}>Recarregar QR Code</Text>
                      </TouchableOpacity>
                    </>
                  ) : currentInvoice.paymentData?.qr_code ? (
                    <>
                      <QRCode
                        value={currentInvoice.paymentData.qr_code}
                        size={200}
                        backgroundColor="white"
                        color={colors.gray[800]}
                      />
                      <Text style={styles.qrCodeStatus}>QR Code gerado com sucesso</Text>
                      <TouchableOpacity
                        style={styles.reloadButton}
                        onPress={() => handleGeneratePayment()}
                      >
                        <MaterialCommunityIcons name="reload" size={20} color={colors.orange} />
                        <Text style={styles.reloadButtonText}>Recarregar QR Code</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <View style={styles.qrCodeError}>
                      <MaterialCommunityIcons name="barcode-off" size={48} color={colors.gray[400]} />
                      <Text style={styles.qrCodeErrorText}>QR Code não disponível</Text>
                      <TouchableOpacity 
                        style={styles.retryButton}
                        onPress={() => {
                          setPaymentMethod('pix');
                          handleGeneratePayment();
                        }}
                      >
                        <Text style={styles.retryButtonText}>Tentar Novamente</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.copyPixButton}
                  onPress={handleCopyPixCode}
                >
                  <MaterialCommunityIcons name="content-copy" size={20} color={colors.white} />
                  <Text style={styles.copyPixButtonText}>Copiar código PIX</Text>
                </TouchableOpacity>
                
                <View style={styles.divider} />
                
                <Text style={styles.alternativeText}>Ou pague usando boleto</Text>
                {currentInvoice.paymentData?.ticket_url ? (
                  <TouchableOpacity
                    style={styles.boletoButton}
                    onPress={() => Linking.openURL(currentInvoice.paymentData?.ticket_url || '')}
                  >
                    <MaterialCommunityIcons name="barcode" size={24} color={colors.orange} />
                    <Text style={styles.boletoButtonText}>Abrir Boleto</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.boletoButton}
                    onPress={async () => {
                      setPaymentMethod('boleto');
                      // Aguarda o próximo ciclo para garantir que o estado foi atualizado
                      await new Promise(resolve => setTimeout(resolve, 0));
                      handleGeneratePayment();
                    }}
                  >
                    <MaterialCommunityIcons name="barcode" size={24} color={colors.orange} />
                    <Text style={styles.boletoButtonText}>Gerar Boleto</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : paymentError ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{paymentError}</Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={() => {
                    setPaymentMethod('pix');
                    handleGeneratePayment();
                  }}
                >
                  <Text style={styles.retryButtonText}>Tentar Novamente</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.paymentLoadingContainer}>
                <ActivityIndicator size="large" color={colors.white} />
                <Text style={styles.loadingText}>Carregando dados do pagamento...</Text>
              </View>
            )}
          </View>
        )}
      </LinearGradient>
    );
  };

  const renderPaymentModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={paymentModalVisible}
      onRequestClose={() => setPaymentModalVisible(false)}
    >
      <BlurView intensity={10} style={styles.modalContainer}>
        <View style={styles.paymentModalContent}>
          <View style={styles.paymentModalHeader}>
            <Text style={styles.paymentModalTitle}>Escolha a forma de pagamento</Text>
            <TouchableOpacity 
              onPress={() => setPaymentModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={colors.gray[800]} />
            </TouchableOpacity>
          </View>

          <View style={styles.paymentMethodsContainer}>
            <PaymentMethodCard
              method="pix"
              selected={paymentMethod === 'pix'}
              onSelect={() => setPaymentMethod('pix')}
              icon={<Ionicons name="qr-code-outline" size={24} color={paymentMethod === 'pix' ? colors.white : colors.gray[800]} />}
              title="PIX"
            />
            <PaymentMethodCard
              method="boleto"
              selected={paymentMethod === 'boleto'}
              onSelect={() => setPaymentMethod('boleto')}
              icon={<MaterialCommunityIcons name="barcode" size={24} color={paymentMethod === 'boleto' ? colors.white : colors.gray[800]} />}
              title="Boleto"
            />
          </View>

          {paymentError && (
            <Text style={styles.errorText}>{paymentError}</Text>
          )}

          <TouchableOpacity 
            style={styles.generatePaymentButton}
            onPress={() => handleGeneratePayment()}
            disabled={isGeneratingPayment}
          >
            {isGeneratingPayment ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.generatePaymentButtonText}>
                Gerar {paymentMethod === 'pix' ? 'PIX' : 'Boleto'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </BlurView>
    </Modal>
  );

  const renderInvoiceDetailsModal = () => {
    if (!selectedInvoice) return null;

    return (
      <Modal
        visible={detailsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <BlurView intensity={10} style={styles.modalContainer}>
          <View style={styles.detailsModalContent}>
            <View style={styles.detailsModalHeader}>
              <TouchableOpacity 
                onPress={() => setDetailsModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.gray[800]} />
              </TouchableOpacity>
              <Text style={styles.detailsModalTitle}>Detalhes da Fatura</Text>
              <View style={styles.headerSpacer} />
            </View>

            <ScrollView style={styles.detailsModalBody}>
              <View style={styles.detailsCard}>
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsLabel}>Período</Text>
                  <Text style={styles.detailsValue}>
                    {getMonthYear(selectedInvoice.startDate)}
                  </Text>
                </View>

                <View style={styles.detailsRow}>
                  <Text style={styles.detailsLabel}>Status</Text>
                  <InvoiceStatusBadge status={selectedInvoice.status} />
                </View>

                <View style={styles.detailsRow}>
                  <Text style={styles.detailsLabel}>Vencimento</Text>
                  <Text style={styles.detailsValue}>
                    {formatDate(selectedInvoice.endDate)}
                  </Text>
                </View>

                <View style={styles.detailsRow}>
                  <Text style={styles.detailsLabel}>Valor Total</Text>
                  <Text style={[styles.detailsValue, styles.detailsValueHighlight]}>
                    {formatCurrency(selectedInvoice.totalAmount)}
                  </Text>
                </View>

                {selectedInvoice.paidAt && (
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>Data de Pagamento</Text>
                    <Text style={styles.detailsValue}>
                      {formatDate(selectedInvoice.paidAt)}
                    </Text>
                  </View>
                )}

                {selectedInvoice.paymentMethod && (
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>Método de Pagamento</Text>
                    <Text style={styles.detailsValue}>
                      {selectedInvoice.paymentMethod === 'pix' ? 'PIX' : 'Boleto'}
                    </Text>
                  </View>
                )}
              </View>

              {selectedInvoice.status === 'pending' && (
                <TouchableOpacity 
                  style={styles.payNowButton}
                  onPress={() => {
                    setDetailsModalVisible(false);
                    setCurrentInvoice(selectedInvoice);
                    setPaymentModalVisible(true);
                  }}
                >
                  <MaterialCommunityIcons name="credit-card-outline" size={24} color={colors.white} />
                  <Text style={styles.payNowButtonText}>Pagar Agora</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </BlurView>
      </Modal>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.orange} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {currentInvoice && renderCurrentInvoiceCard()}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Histórico de Faturas</Text>
          {invoices.length > 0 ? (
            <View style={styles.invoicesList}>
              {invoices.map((invoice) => (
                <TouchableOpacity
                  key={invoice.id}
                  style={styles.invoiceItem}
                  onPress={() => handleInvoicePress(invoice)}
                >
                  <View style={styles.invoiceItemLeft}>
                    <Text style={styles.invoiceMonth}>
                      {getMonthYear(invoice.startDate)}
                    </Text>
                    <Text style={styles.invoiceDueDate}>
                      Vencimento: {formatDate(invoice.endDate)}
                    </Text>
                  </View>
                  <View style={styles.invoiceItemRight}>
                    <Text style={styles.invoiceAmount}>
                      {formatCurrency(invoice.totalAmount)}
                    </Text>
                    <InvoiceStatusBadge status={invoice.status} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <EmptyState />
          )}
        </View>
      </ScrollView>

      {renderPaymentModal()}
      {renderInvoiceDetailsModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[100],
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  currentInvoiceCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    elevation: 8,
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  currentInvoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  currentInvoiceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currentInvoiceTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.white,
  },
  currentInvoiceContent: {
    marginBottom: 20,
  },
  currentInvoiceMonth: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 20,
    textTransform: 'capitalize',
  },
  totalContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 20,
  },
  totalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: colors.white,
    opacity: 0.9,
  },
  totalValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 12,
  },
  currentInvoiceDueDate: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.8,
  },
  payButton: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.orange,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.gray[800],
    marginBottom: 16,
  },
  invoicesList: {
    gap: 12,
  },
  invoiceItem: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: colors.gray[400],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  invoiceItemLeft: {
    flex: 1,
  },
  invoiceItemRight: {
    alignItems: 'flex-end',
  },
  invoiceMonth: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.gray[800],
    textTransform: 'capitalize',
  },
  invoiceDueDate: {
    fontSize: 14,
    color: colors.gray[600],
    marginTop: 4,
  },
  invoiceAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.gray[800],
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  paymentModalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: '50%',
  },
  paymentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  paymentModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.gray[800],
  },
  closeButton: {
    padding: 4,
  },
  paymentMethodsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  paymentMethodCard: {
    flex: 1,
    backgroundColor: colors.gray[100],
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentMethodCardSelected: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  paymentMethodIcon: {
    marginBottom: 8,
  },
  paymentMethodText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[800],
  },
  paymentMethodTextSelected: {
    color: colors.white,
  },
  errorText: {
    color: colors.red[500],
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  generatePaymentButton: {
    backgroundColor: colors.orange,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  generatePaymentButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.white,
    borderRadius: 16,
    elevation: 2,
    shadowColor: colors.gray[400],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.orange + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.gray[800],
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.gray[600],
    textAlign: 'center',
    lineHeight: 20,
  },
  detailsModalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: '60%',
    maxHeight: '90%',
  },
  detailsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  detailsModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.gray[800],
  },
  headerSpacer: {
    width: 24,
  },
  detailsModalBody: {
    flex: 1,
  },
  detailsCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  detailsLabel: {
    fontSize: 16,
    color: colors.gray[600],
  },
  detailsValue: {
    fontSize: 16,
    color: colors.gray[800],
    fontWeight: '500',
  },
  detailsValueHighlight: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.orange,
  },
  payNowButton: {
    backgroundColor: colors.orange,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
  },
  payNowButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  qrCodeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: colors.gray[800],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  qrCodeWrapper: {
    padding: 20,
    backgroundColor: colors.white,
    borderRadius: 12,
    shadowColor: colors.gray[400],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
    width: '100%',
    marginVertical: 16,
  },
  qrCodeImage: {
    width: 240,
    height: 240,
    backgroundColor: colors.white,
  },
  qrCodeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.gray[800],
    marginBottom: 8,
  },
  reloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.orange,
  },
  reloadButtonText: {
    color: colors.orange,
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  qrCodeError: {
    width: 200,
    height: 200,
    backgroundColor: colors.gray[100],
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  qrCodeErrorText: {
    color: colors.gray[600],
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 16,
  },
  qrCodeStatus: {
    color: colors.green[500],
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
  },
  copyPixButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.orange,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  copyPixButtonText: {
    color: colors.white,
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  boletoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.orange,
  },
  boletoButtonText: {
    color: colors.orange,
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  paymentContainer: {
    marginTop: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  retryButton: {
    backgroundColor: colors.orange,
    borderRadius: 8,
    padding: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[200],
    marginVertical: 16,
  },
  alternativeText: {
    fontSize: 14,
    color: colors.white,
    marginBottom: 16,
  },
}); 