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
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { appFeeService } from '@/services/appFeeService';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

interface InvoiceDetail {
  id: string;
  orderDate: Timestamp;
  orderTotalPrice: number;
  paymentMethod: string;
  percentage: number;
  value: number;
}

interface Invoice {
  id: string;
  partnerId: string;
  startDate: Timestamp;
  endDate: Timestamp;
  createdAt: Timestamp;
  totalAmount: number;
  status: 'pending' | 'paid' | 'overdue';
  paymentId?: string;
  paymentMethod?: 'pix' | 'boleto';
  paymentData?: {
    qr_code?: string;
    qr_code_base64?: string;
    ticket_url?: string;
  };
  paidAt?: Timestamp;
  details: InvoiceDetail[];
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (date: Timestamp): string => {
  return format(date.toDate(), 'dd/MM/yyyy', { locale: ptBR });
};

const getMonthYear = (date: Timestamp): string => {
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

  const loadInvoices = async () => {
    if (!user?.uid) return;
    
    setIsLoading(true);
    try {
      const invoicesRef = collection(db, 'partners', user.uid, 'invoices');
      const q = query(invoicesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const loadedInvoices = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data();
          const invoice: Invoice = {
            id: doc.id,
            partnerId: user.uid,
            startDate: data.startDate || data.createdAt,
            endDate: data.endDate,
            createdAt: data.createdAt,
            totalAmount: data.totalAmount || 0,
            status: data.status || 'pending',
            details: data.details || [],
            paymentId: data.paymentId,
            paymentMethod: data.paymentMethod,
            paymentData: data.paymentData,
            paidAt: data.paidAt
          };
          return invoice;
        })
      );
      
      setInvoices(loadedInvoices);
      const pendingInvoice = loadedInvoices.find(inv => inv.status === 'pending');
      setCurrentInvoice(pendingInvoice || null);
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

  const handleGeneratePayment = async () => {
    if (!currentInvoice) return;
    
    setIsGeneratingPayment(true);
    setPaymentError(null);
    
    try {
      await appFeeService.generatePayment(currentInvoice, paymentMethod);
      const updatedInvoice = await appFeeService.getInvoiceById(currentInvoice.id);
      setCurrentInvoice({
        ...updatedInvoice,
        startDate: currentInvoice.startDate,
        details: currentInvoice.details
      });
      setPaymentModalVisible(true);
    } catch (error) {
      setPaymentError('Não foi possível gerar o pagamento. Tente novamente.');
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

        <TouchableOpacity 
          style={styles.payButton}
          onPress={() => setPaymentModalVisible(true)}
        >
          <MaterialCommunityIcons name="credit-card-outline" size={24} color={colors.orange} />
          <Text style={styles.payButtonText}>Pagar Fatura</Text>
        </TouchableOpacity>
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
            onPress={handleGeneratePayment}
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
}); 