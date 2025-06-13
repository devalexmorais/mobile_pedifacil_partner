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
  Platform,
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
import { mercadoPagoService } from '@/services/mercadoPagoService';

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
  barCode?: string;
}

interface PaymentInfo {
  paymentUrl?: string;
  qrCodeBase64?: string;
  boletoUrl?: string;
  barCode?: string;
  paymentId?: number;
  paymentMethod?: 'pix' | 'boleto';
  status?: string;
  partnerId?: string;
  history?: Array<{
    status: string;
    date: any;
    detail: string;
  }>;
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

  useEffect(() => {
    if (currentInvoice?.status === 'pending' && currentInvoice?.paymentInfo?.paymentId) {
      const checkStatus = async () => {
        try {
          const paymentId = currentInvoice.paymentInfo?.paymentId;
          if (!paymentId) return;
          const status = await mercadoPagoService.getPaymentStatus(paymentId.toString());


          if (status === 'approved') {
            console.log('Pagamento aprovado! Recarregando faturas...');
            await loadInvoices();
            Alert.alert('Pagamento Confirmado', 'Seu pagamento foi processado com sucesso!');
          }
        } catch (error) {
          console.error('Erro ao verificar status:', error);
        }
      };

      // Verifica a cada 5 segundos para atualizações mais rápidas
      const interval = setInterval(checkStatus, 5000);
      checkStatus(); // Verifica imediatamente

      return () => clearInterval(interval);
    }
  }, [currentInvoice?.paymentInfo?.paymentId, currentInvoice?.status]);

  // Adiciona listener para atualizações em tempo real do Firestore
  useEffect(() => {
    if (!user?.uid || !currentInvoice?.id) return;

    console.log('Configurando listener em tempo real para a fatura:', currentInvoice.id);
    
    const invoiceRef = doc(db, 'partners', user.uid, 'invoices', currentInvoice.id);
    const unsubscribe = onSnapshot(invoiceRef, (snapshot) => {
      if (!snapshot.exists()) return;

      const data = snapshot.data();
      console.log('Atualização em tempo real recebida:', data);

      // Atualiza a fatura atual com os novos dados
      setCurrentInvoice(prev => ({
        ...prev!,
        ...data,
        id: snapshot.id,
        status: data.status || 'pending',
        paymentInfo: data.paymentInfo,
        paymentData: data.paymentData || {},
        paidAt: data.paidAt
      }));

      // Se o pagamento foi confirmado, mostra mensagem
      if (data.status === 'paid') {
        Alert.alert('Pagamento Confirmado', 'Seu pagamento foi processado com sucesso!');
      }
    }, (error) => {
      console.error('Erro no listener em tempo real:', error);
    });

    return () => unsubscribe();
  }, [user?.uid, currentInvoice?.id]);

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
        
        // Não gera pagamento automaticamente - deixa o usuário escolher
        console.log('Fatura carregada. Aguardando escolha do método de pagamento pelo usuário.');
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
      
      console.log('Dados do parceiro para boleto:', {
        hasAddress: !!partnerData?.address,
        address: partnerData?.address
      });

      // Validação mais detalhada do endereço para boleto
      if (paymentMethod === 'boleto') {
        if (!partnerData?.address) {
          throw new Error('Endereço não encontrado. Por favor, atualize seu cadastro.');
        }

        const requiredFields = {
          zip_code: 'CEP',
          street: 'Rua',
          number: 'Número',
          neighborhoodName: 'Bairro',
          cityName: 'Cidade',
          stateName: 'Estado'
        };

        const missingFields = Object.entries(requiredFields)
          .filter(([key]) => !partnerData.address[key])
          .map(([_, label]) => label);

        if (missingFields.length > 0) {
          throw new Error(
            `Para gerar um boleto, os seguintes campos de endereço são obrigatórios: ${missingFields.join(', ')}. Por favor, atualize seu cadastro.`
          );
        }
      }

      let paymentData: any = {
        partnerId: user.uid,
        invoiceId: targetInvoice.id,
        tipoPagamento: paymentMethod
      };

      // Para boleto, adiciona os dados no formato correto do Mercado Pago
      if (paymentMethod === 'boleto' && partnerData?.address) {
        // Validação dos dados necessários para boleto
        const requiredPartnerFields = {
          email: partnerData.email || partnerData.user?.email,
          name: partnerData.name || partnerData.displayName,
          cpf: partnerData.store?.document || partnerData.cpf || partnerData.document
        };

        console.log('📋 Dados do parceiro para boleto:', {
          email: requiredPartnerFields.email,
          name: requiredPartnerFields.name,
          cpf: requiredPartnerFields.cpf,
          hasAddress: !!partnerData.address,
          storeDocument: partnerData.store?.document,
          directCpf: partnerData.cpf,
          directDocument: partnerData.document
        });

        // Extrai primeiro e último nome
        const nameParts = (requiredPartnerFields.name || '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Estrutura correta para a API do Mercado Pago
        paymentData.transaction_amount = targetInvoice.totalAmount;
        paymentData.description = `Fatura ${getMonthYear(targetInvoice.startDate)} - PediFacil Partner`;
        paymentData.payment_method_id = 'bolbradesco'; // ou outro banco
        paymentData.payer = {
          email: String(requiredPartnerFields.email || ''),
          first_name: String(firstName || ''),
          last_name: String(lastName || ''),
          identification: {
            type: 'CPF',
            number: String(requiredPartnerFields.cpf?.replace(/\D/g, '') || '')
          },
          address: {
            zip_code: String(partnerData.address.zip_code?.replace(/\D/g, '') || ''),
            street_name: String(partnerData.address.street || ''),
            street_number: String(partnerData.address.number || ''),
            neighborhood: String(partnerData.address.neighborhoodName || ''),
            city: String(partnerData.address.cityName || ''),
            federal_unit: (() => {
              const stateName = partnerData.address.stateName?.toLowerCase();
              const stateMap: { [key: string]: string } = {
                'rio grande do norte': 'RN',
                'rio grande do sul': 'RS',
                'minas gerais': 'MG',
                'são paulo': 'SP',
                'rio de janeiro': 'RJ',
                'bahia': 'BA',
                'paraná': 'PR',
                'ceará': 'CE',
                'pernambuco': 'PE',
                'santa catarina': 'SC',
                'paraíba': 'PB',
                'alagoas': 'AL',
                'sergipe': 'SE',
                'maranhão': 'MA',
                'piauí': 'PI',
                'goiás': 'GO',
                'mato grosso': 'MT',
                'mato grosso do sul': 'MS',
                'distrito federal': 'DF',
                'espírito santo': 'ES',
                'rondônia': 'RO',
                'acre': 'AC',
                'amazonas': 'AM',
                'roraima': 'RR',
                'pará': 'PA',
                'amapá': 'AP',
                'tocantins': 'TO'
              };
              return stateMap[stateName || ''] || stateName?.substring(0, 2).toUpperCase() || '';
            })()
          }
        };

        // Validação dos campos obrigatórios
        const missingFields = [];
        if (!paymentData.payer.email) missingFields.push('email');
        if (!paymentData.payer.first_name) missingFields.push('nome');
        if (!paymentData.payer.identification.number) missingFields.push('CPF');
        if (!paymentData.payer.address.zip_code) missingFields.push('CEP');
        if (!paymentData.payer.address.street_name) missingFields.push('rua');
        if (!paymentData.payer.address.street_number) missingFields.push('número');
        if (!paymentData.payer.address.neighborhood) missingFields.push('bairro');
        if (!paymentData.payer.address.city) missingFields.push('cidade');
        if (!paymentData.payer.address.federal_unit) missingFields.push('estado');

        if (missingFields.length > 0) {
          throw new Error(`Para gerar um boleto, os seguintes dados são obrigatórios: ${missingFields.join(', ')}. Por favor, complete seu cadastro.`);
        }
      }

      console.log('Dados do pagamento:', paymentData);

      // Log final dos dados que serão enviados
      console.log('🚀 Enviando para servidor:', JSON.stringify(paymentData, null, 2));
      
      // Para boleto, log extra de verificação
      if (paymentMethod === 'boleto') {
        console.log('🔍 Verificação final do boleto:', {
          temTransactionAmount: !!paymentData.transaction_amount,
          temDescription: !!paymentData.description,
          temPaymentMethod: !!paymentData.payment_method_id,
          temPayer: !!paymentData.payer,
          temPayerEmail: !!paymentData.payer?.email,
          temPayerName: !!(paymentData.payer?.first_name && paymentData.payer?.last_name),
          temPayerCPF: !!paymentData.payer?.identification?.number,
          temPayerAddress: !!paymentData.payer?.address,
          todosOsCamposAddress: !!(
            paymentData.payer?.address?.zip_code &&
            paymentData.payer?.address?.street_name &&
            paymentData.payer?.address?.street_number &&
            paymentData.payer?.address?.neighborhood &&
            paymentData.payer?.address?.city &&
            paymentData.payer?.address?.federal_unit
          ),
          payerAddressCompleto: paymentData.payer?.address
        });
      }
      
      const gerarPagamento = httpsCallable(functions, 'gerarPagamento');
      let result;
      
      try {
        result = await gerarPagamento(paymentData);
        console.log('✅ Resposta do servidor recebida:', result);
              } catch (serverError: any) {
        console.error('❌ Erro detalhado do servidor:', {
          code: serverError.code,
          message: serverError.message,
          details: serverError.details,
          customData: serverError.customData,
          stack: serverError.stack
        });

        // Para boleto, tentar com estrutura alternativa como último recurso
        if (paymentMethod === 'boleto' && serverError.message?.includes('campos de endereço são obrigatórios')) {
          console.log('🔄 Tentando enviar boleto com estrutura híbrida...');
          
          const hybridPaymentData = {
            ...paymentData,
            // Adiciona os campos também no nível raiz (compatibilidade)
            zip_code: paymentData.payer?.address?.zip_code,
            street_name: paymentData.payer?.address?.street_name,
            street_number: paymentData.payer?.address?.street_number,
            neighborhood: paymentData.payer?.address?.neighborhood,
            city: paymentData.payer?.address?.city,
            federal_unit: paymentData.payer?.address?.federal_unit,
            // E também em uma estrutura address simples
            address: paymentData.payer?.address
          };

          console.log('🚀 Estrutura híbrida:', JSON.stringify(hybridPaymentData, null, 2));
          
          try {
            result = await gerarPagamento(hybridPaymentData);
            console.log('✅ Sucesso com estrutura híbrida!', result);
          } catch (hybridError: any) {
            console.error('❌ Erro também na estrutura híbrida:', hybridError.message);
            throw serverError; // Lança o erro original
          }
        } else {
          throw serverError;
        }
      }

      console.log('Resposta detalhada do servidor:', {
        data: result.data,
        paymentMethod,
        boletoUrl: (result.data as any)?.boletoUrl,
        paymentInfo: (result.data as any)?.paymentInfo,
        paymentData: (result.data as any)?.paymentData
      });

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
        
        let boletoUrl = null;
        let boletoBarCode = null;
        if (paymentMethod === 'boleto') {
          if (!result.data) {
            console.error('Dados do pagamento não retornados:', result);
            throw new Error('Dados do pagamento não retornados pelo servidor. Tente novamente.');
          }

                  boletoUrl = data?.paymentInfo?.boletoUrl || 
                   data?.paymentData?.ticket_url || 
                   (result.data as any)?.boletoUrl;
        
        boletoBarCode = data?.paymentInfo?.barCode || 
                       data?.paymentData?.barCode || 
                       (result.data as any)?.barCode;
        
        console.log('🔍 Código de barras encontrado:', boletoBarCode);
          
          if (!boletoUrl) {
            console.error('URL do boleto não encontrado nos dados:', { data, result });
            throw new Error('URL do boleto não gerado. Por favor, tente novamente.');
          }
          
          console.log('URL do boleto encontrado:', boletoUrl);
          console.log('Código de barras do boleto:', boletoBarCode);
        }
        
        const updatedInvoice = {
          ...data,
          id: updatedInvoiceSnap.id,
          partnerId: user.uid,
          startDate: data?.startDate || data?.createdAt,
          endDate: data?.endDate || data?.createdAt,
          createdAt: data?.createdAt,
          totalAmount: data?.totalAmount || 0,
          status: data?.status || 'pending',
          details: data?.details || [],
          paymentData: {
            qr_code: data?.paymentInfo?.paymentUrl || data?.paymentData?.qr_code,
            qr_code_base64: data?.paymentInfo?.qrCodeBase64 || data?.paymentData?.qr_code_base64,
            ticket_url: boletoUrl,
            barCode: boletoBarCode
          },
          paymentInfo: {
            ...data?.paymentInfo,
            barCode: boletoBarCode || data?.paymentInfo?.barCode
          }
        } as Invoice;
        
        console.log('Fatura atualizada:', updatedInvoice);
        setCurrentInvoice(updatedInvoice);

        if (paymentMethod === 'boleto' && boletoUrl) {
          console.log('Abrindo URL do boleto:', boletoUrl);
          Linking.openURL(boletoUrl);
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

  const handleSyncPaymentStatus = async (invoice: Invoice) => {
    if (!invoice.paymentInfo?.paymentId && !invoice.paymentId) {
      Alert.alert('Erro', 'Esta fatura não possui um ID de pagamento válido.');
      return;
    }

    try {
      setIsGeneratingPayment(true);
      console.log('🔄 Iniciando sincronização manual do status do pagamento...');
      
      const paymentId = invoice.paymentInfo?.paymentId || invoice.paymentId;
      const syncPaymentStatus = httpsCallable(functions, 'syncPaymentStatus');
      
      const result = await syncPaymentStatus({ paymentId });
      const resultData = result.data as any;
      console.log('✅ Resultado da sincronização:', resultData);
      
      if (resultData?.success) {
        Alert.alert('Sucesso', resultData.message || 'Status sincronizado com sucesso');
        await loadInvoices(); // Recarrega as faturas
      }
    } catch (error) {
      console.error('❌ Erro ao sincronizar status:', error);
      Alert.alert('Erro', 'Não foi possível sincronizar o status do pagamento. Tente novamente.');
    } finally {
      setIsGeneratingPayment(false);
    }
  };

  const handleTestWebhook = async (invoice: Invoice) => {
    if (!invoice.paymentInfo?.paymentId && !invoice.paymentId) {
      Alert.alert('Erro', 'Esta fatura não possui um pagamento associado');
      return;
    }

    try {
      setIsGeneratingPayment(true);
      
      const paymentId = invoice.paymentInfo?.paymentId || invoice.paymentId;
      console.log('🧪 Testando webhook para fatura:', invoice.id);
      console.log('🧪 PaymentId:', paymentId);
      
      const testWebhook = httpsCallable(functions, 'testWebhook');
      const result = await testWebhook({ paymentId });
      
      console.log('🧪 Resultado do teste webhook:', result.data);
      
      const resultData = result.data as any;
      Alert.alert(
        'Teste do Webhook',
        `Status: ${resultData.paymentStatus}\nResultado: ${resultData.message}`,
        [{ text: 'OK' }]
      );
      
      // Recarrega as faturas após o teste
      await loadInvoices();
      
    } catch (error: any) {
      console.error('Erro no teste webhook:', error);
      Alert.alert('Erro', 'Falha ao testar webhook: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsGeneratingPayment(false);
    }
  };

  const handleCheckMercadoPago = async (invoice: Invoice) => {
    if (!invoice.paymentInfo?.paymentId && !invoice.paymentId) {
      Alert.alert('Erro', 'Esta fatura não possui um pagamento associado');
      return;
    }

    try {
      setIsGeneratingPayment(true);
      
      const paymentId = invoice.paymentInfo?.paymentId || invoice.paymentId;
      console.log('🔍 Consultando Mercado Pago para fatura:', invoice.id);
      console.log('🔍 PaymentId:', paymentId);
      
      const checkMercadoPago = httpsCallable(functions, 'checkMercadoPagoPayment');
      const result = await checkMercadoPago({ paymentId });
      
      console.log('🔍 Resultado da consulta MP:', result.data);
      
      const resultData = result.data as any;
      const payment = resultData.payment;
      let statusMessage = `Status: ${payment.status}`;
      
      if (payment.status_detail) {
        statusMessage += `\nDetalhe: ${payment.status_detail}`;
      }
      
      if (payment.date_last_updated) {
        const lastUpdate = new Date(payment.date_last_updated).toLocaleString('pt-BR');
        statusMessage += `\nÚltima atualização: ${lastUpdate}`;
      }
      
      Alert.alert(
        'Status no Mercado Pago',
        statusMessage,
        [{ text: 'OK' }]
      );
      
    } catch (error: any) {
      console.error('Erro ao consultar Mercado Pago:', error);
      Alert.alert('Erro', 'Falha ao consultar Mercado Pago: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsGeneratingPayment(false);
    }
  };

  const handleClearInvoicePayment = async (invoice: Invoice) => {
    Alert.alert(
      'Limpar Dados de Pagamento',
      'Isso irá remover todos os dados de pagamento desta fatura e permitir gerar um novo pagamento. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsGeneratingPayment(true);
              
              console.log('🧹 Limpando dados de pagamento para fatura:', invoice.id);
              
              const clearPayment = httpsCallable(functions, 'clearInvoicePayment');
              const result = await clearPayment({ 
                invoiceId: invoice.id, 
                partnerId: invoice.partnerId 
              });
              
              console.log('🧹 Resultado da limpeza:', result.data);
              
              const resultData = result.data as any;
              Alert.alert('Sucesso', resultData.message);
              
              // Recarrega as faturas
              await loadInvoices();
              
            } catch (error: any) {
              console.error('Erro ao limpar dados de pagamento:', error);
              Alert.alert('Erro', 'Falha ao limpar dados: ' + (error.message || 'Erro desconhecido'));
            } finally {
              setIsGeneratingPayment(false);
            }
          }
        }
      ]
    );
  };

  const formatBoletoCode = (barCode: string): string => {
    if (!barCode) return '';
    
    // Remove espaços e pontos se existirem
    const cleanCode = barCode.replace(/[\s.]/g, '');
    
    // Se tem 44 dígitos, formata no padrão do boleto: XXXXX.XXXXX XXXXX.XXXXXX XXXXX.XXXXXX X XXXXXXXXXXXXXX
    if (cleanCode.length === 44) {
      return `${cleanCode.slice(0, 5)}.${cleanCode.slice(5, 10)} ${cleanCode.slice(10, 15)}.${cleanCode.slice(15, 21)} ${cleanCode.slice(21, 26)}.${cleanCode.slice(26, 32)} ${cleanCode.slice(32, 33)} ${cleanCode.slice(33)}`;
    }
    
    // Se não tem 44 dígitos, retorna como está (mas limpo)
    return cleanCode;
  };

  const handleCopyPixCode = async () => {
    const pixCode = currentInvoice?.paymentData?.qr_code || currentInvoice?.paymentInfo?.paymentUrl;
    if (pixCode) {
      await Clipboard.setStringAsync(pixCode);
      Alert.alert('Código PIX copiado!');
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
            ) : currentInvoice.paymentData?.qr_code || currentInvoice.paymentData?.qr_code_base64 || currentInvoice.paymentData?.ticket_url || currentInvoice.paymentInfo?.paymentUrl || currentInvoice.paymentInfo?.qrCodeBase64 || currentInvoice.paymentInfo?.boletoUrl ? (
              <View style={styles.qrCodeContainer}>
                {(currentInvoice.paymentData?.qr_code || currentInvoice.paymentData?.qr_code_base64 || currentInvoice.paymentInfo?.paymentUrl || currentInvoice.paymentInfo?.qrCodeBase64) && (
                  <>
                    <Text style={styles.qrCodeTitle}>Pague sua fatura usando PIX</Text>
                                          <View style={styles.qrCodeWrapper}>
                        {(currentInvoice.paymentData?.qr_code_base64 || currentInvoice.paymentInfo?.qrCodeBase64) ? (
                          <>
                            <Image
                              source={{ uri: `data:image/png;base64,${currentInvoice.paymentData?.qr_code_base64 || currentInvoice.paymentInfo?.qrCodeBase64}` }}
                              style={styles.qrCodeImage}
                              resizeMode="contain"
                            />
                            <Text style={styles.qrCodeStatus}>QR Code carregado com sucesso</Text>
                          </>
                        ) : (currentInvoice.paymentData?.qr_code || currentInvoice.paymentInfo?.paymentUrl) ? (
                          <>
                            <QRCode
                              value={currentInvoice.paymentData?.qr_code || currentInvoice.paymentInfo?.paymentUrl || ''}
                              size={200}
                              backgroundColor="white"
                              color={colors.gray[800]}
                            />
                            <Text style={styles.qrCodeStatus}>QR Code gerado com sucesso</Text>
                          </>
                        ) : null}
                      </View>
                    <TouchableOpacity
                      style={styles.copyPixButton}
                      onPress={handleCopyPixCode}
                    >
                      <MaterialCommunityIcons name="content-copy" size={20} color={colors.white} />
                      <Text style={styles.copyPixButtonText}>Copiar código PIX</Text>
                    </TouchableOpacity>
                    
                    <View style={styles.divider} />
                  </>
                )}
                
                {(currentInvoice.paymentData?.ticket_url || currentInvoice.paymentInfo?.boletoUrl) ? (
                  <View>
                    <Text style={[styles.qrCodeTitle, { color: colors.gray[800] }]}>Pague sua fatura usando Boleto</Text>
                    <View style={styles.boletoInfoContainer}>
                      <View style={styles.boletoCodeContainer}>
                        <MaterialCommunityIcons name="barcode" size={48} color={colors.gray[800]} />
                        <View style={styles.boletoCodeTextContainer}>
                          {(() => {
                            const barCode = currentInvoice.paymentData?.barCode || currentInvoice.paymentInfo?.barCode;
                            if (barCode) {
                              const formattedCode = formatBoletoCode(barCode);
                              return (
                                <Text style={styles.boletoCode} selectable>
                                  {formattedCode}
                                </Text>
                              );
                            } else {
                              // Se não tem código de barras, mostra mensagem de carregamento
                              return (
                                <Text style={styles.boletoCode} numberOfLines={2}>
                                  Código de pagamento será exibido aqui
                                </Text>
                              );
                            }
                          })()}
                          <Text style={styles.boletoCodeLabel}>
                            Código de barras para pagamento
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.boletoDueDateContainer}>
                        <MaterialCommunityIcons name="calendar" size={20} color={colors.gray[600]} />
                        <Text style={styles.boletoDueDate}>
                          Vencimento: {formatDate(currentInvoice.endDate)}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.boletoButton}
                      onPress={() => Linking.openURL(currentInvoice.paymentData?.ticket_url || currentInvoice.paymentInfo?.boletoUrl || '')}
                    >
                      <MaterialCommunityIcons name="open-in-new" size={24} color={colors.orange} />
                      <Text style={styles.boletoButtonText}>Abrir Boleto no Navegador</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.copyBoletoButton}
                      onPress={async () => {
                        const barCode = currentInvoice.paymentData?.barCode || currentInvoice.paymentInfo?.barCode;
                        
                        if (barCode) {
                          // Copia o código de barras formatado
                          const formattedCode = formatBoletoCode(barCode);
                          await Clipboard.setStringAsync(formattedCode);
                          Alert.alert('Sucesso', 'Código de barras copiado!\nVocê pode colar este código em qualquer app bancário.');
                        } else {
                          Alert.alert('Atenção', 'Código de barras ainda não disponível. Tente novamente em alguns segundos.');
                        }
                      }}
                    >
                      <MaterialCommunityIcons name="content-copy" size={20} color={colors.orange} />
                      <Text style={styles.copyBoletoButtonText}>
                        Copiar código de pagamento
                      </Text>
                    </TouchableOpacity>

                    <Text style={styles.boletoInstructions}>
                      Use o código de pagamento acima em qualquer banco, casa lotérica ou app bancário até a data de vencimento.
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={[styles.qrCodeTitle, { color: colors.gray[800], marginTop: 16 }]}>Ou pague usando boleto</Text>
                    <TouchableOpacity
                      style={styles.boletoButton}
                      onPress={async () => {
                        setPaymentMethod('boleto');
                        await new Promise(resolve => setTimeout(resolve, 0));
                        handleGeneratePayment();
                      }}
                    >
                      <MaterialCommunityIcons name="barcode" size={24} color={colors.orange} />
                      <Text style={styles.boletoButtonText}>Gerar Boleto</Text>
                    </TouchableOpacity>
                  </>
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
              <View style={styles.paymentOptionsContainer}>
                <Text style={styles.paymentOptionsTitle}>Escolha como pagar sua fatura:</Text>
                
                <View style={styles.paymentButtonsContainer}>
                  <TouchableOpacity
                    style={styles.paymentOptionButton}
                    onPress={async () => {
                      setPaymentMethod('pix');
                      await handleGeneratePayment();
                    }}
                    disabled={isGeneratingPayment}
                  >
                    <View style={styles.paymentOptionContent}>
                      <Ionicons name="qr-code-outline" size={32} color={colors.white} />
                      <Text style={styles.paymentOptionTitle}>PIX</Text>
                      <Text style={styles.paymentOptionDescription}>Instantâneo</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.paymentOptionButton}
                    onPress={async () => {
                      setPaymentMethod('boleto');
                      await handleGeneratePayment();
                    }}
                    disabled={isGeneratingPayment}
                  >
                    <View style={styles.paymentOptionContent}>
                      <MaterialCommunityIcons name="barcode" size={32} color={colors.white} />
                      <Text style={styles.paymentOptionTitle}>Boleto</Text>
                      <Text style={styles.paymentOptionDescription}>Até 3 dias úteis</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                <Text style={styles.paymentOptionsNote}>
                  Selecione uma opção para gerar o pagamento da sua fatura
                </Text>
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

            <ScrollView 
              style={styles.detailsModalBody}
              showsVerticalScrollIndicator={false}
            >
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
                <View style={styles.actionButtonsContainer}>
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
                  
                  {(selectedInvoice.paymentInfo?.paymentId || selectedInvoice.paymentId) && (
                    <TouchableOpacity 
                      style={styles.syncButton}
                      onPress={() => handleSyncPaymentStatus(selectedInvoice)}
                      disabled={isGeneratingPayment}
                    >
                      <MaterialCommunityIcons 
                        name="sync" 
                        size={20} 
                        color={colors.orange} 
                      />
                      <Text style={styles.syncButtonText}>
                        {isGeneratingPayment ? 'Sincronizando...' : 'Sincronizar Status'}
                      </Text>
                    </TouchableOpacity>
                  )}

                </View>
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
          {invoices.filter(invoice => invoice.status === 'paid').length > 0 ? (
            <View style={styles.invoicesList}>
              {invoices
                .filter(invoice => invoice.status === 'paid')
                .map((invoice) => (
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
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <MaterialCommunityIcons name="receipt" size={48} color={colors.orange} />
              </View>
              <Text style={styles.emptyTitle}>Nenhuma fatura paga ainda</Text>
              <Text style={styles.emptyDescription}>
                Quando você efetuar o pagamento de uma fatura, ela aparecerá aqui no seu histórico.
              </Text>
            </View>
          )}
        </View>

        {/* Botões de Teste e Debug */}
        {invoices.some(invoice => 
          invoice.status === 'pending' && 
          (invoice.paymentInfo?.paymentId || invoice.paymentId)
        ) && (
          <View style={styles.debugSection}>
            <Text style={styles.debugSectionTitle}>🛠️ Ferramentas de Debug</Text>
            <View style={styles.debugButtonsContainer}>
              <TouchableOpacity 
                style={styles.debugTestButton}
                onPress={() => {
                  const pendingInvoice = invoices.find(invoice => 
                    invoice.status === 'pending' && 
                    (invoice.paymentInfo?.paymentId || invoice.paymentId)
                  );
                  if (pendingInvoice) {
                    console.log('🧪 Testando webhook para fatura:', pendingInvoice.id);
                    console.log('🧪 PaymentId:', pendingInvoice.paymentInfo?.paymentId || pendingInvoice.paymentId);
                    handleTestWebhook(pendingInvoice);
                  }
                }}
                disabled={isGeneratingPayment}
              >
                <MaterialCommunityIcons 
                  name="cog" 
                  size={24} 
                  color={colors.white} 
                />
                <Text style={styles.debugTestButtonText}>
                  {isGeneratingPayment ? 'Testando Webhook...' : 'Testar Webhook Manual'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.debugSyncButton}
                onPress={() => {
                  const pendingInvoice = invoices.find(invoice => 
                    invoice.status === 'pending' && 
                    (invoice.paymentInfo?.paymentId || invoice.paymentId)
                  );
                  if (pendingInvoice) {
                    console.log('🔄 Sincronizando status para fatura:', pendingInvoice.id);
                    handleSyncPaymentStatus(pendingInvoice);
                  }
                }}
                disabled={isGeneratingPayment}
              >
                <MaterialCommunityIcons 
                  name="sync" 
                  size={24} 
                  color={colors.orange} 
                />
                <Text style={styles.debugSyncButtonText}>
                  {isGeneratingPayment ? 'Sincronizando...' : 'Sincronizar Status'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.debugCheckButton}
                onPress={() => {
                  const pendingInvoice = invoices.find(invoice => 
                    invoice.status === 'pending' && 
                    (invoice.paymentInfo?.paymentId || invoice.paymentId)
                  );
                  if (pendingInvoice) {
                    console.log('🔍 Consultando Mercado Pago para fatura:', pendingInvoice.id);
                    handleCheckMercadoPago(pendingInvoice);
                  }
                }}
                disabled={isGeneratingPayment}
              >
                <MaterialCommunityIcons 
                  name="magnify" 
                  size={24} 
                  color={colors.blue[600]} 
                />
                <Text style={styles.debugCheckButtonText}>
                  {isGeneratingPayment ? 'Consultando...' : 'Consultar Mercado Pago'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.debugClearButton}
                onPress={() => {
                  const pendingInvoice = invoices.find(invoice => 
                    invoice.status === 'pending' && 
                    (invoice.paymentInfo?.paymentId || invoice.paymentId)
                  );
                  if (pendingInvoice) {
                    console.log('🧹 Limpando dados para fatura:', pendingInvoice.id);
                    handleClearInvoicePayment(pendingInvoice);
                  }
                }}
                disabled={isGeneratingPayment}
              >
                <MaterialCommunityIcons 
                  name="delete-sweep" 
                  size={24} 
                  color={colors.red[600]} 
                />
                <Text style={styles.debugClearButtonText}>
                  {isGeneratingPayment ? 'Limpando...' : 'Limpar Dados de Pagamento'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
    maxHeight: '95%',
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
    justifyContent: 'center',
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.orange,
    marginBottom: 12,
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
  copyBoletoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.orange,
  },
  copyBoletoButtonText: {
    color: colors.orange,
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  boletoInfoContainer: {
    marginBottom: 16,
  },
  boletoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.gray[800],
    marginBottom: 8,
  },
  boletoCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  boletoCode: {
    fontSize: 14,
    color: colors.gray[800],
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    flex: 1,
    lineHeight: 20,
  },
  boletoInstructions: {
    fontSize: 14,
    color: colors.gray[600],
    marginTop: 8,
  },
  boletoDueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  boletoDueDate: {
    fontSize: 14,
    color: colors.gray[600],
    marginLeft: 8,
  },
  boletoCodeTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  boletoCodeLabel: {
    fontSize: 12,
    color: colors.gray[600],
    marginTop: 4,
  },
  actionButtonsContainer: {
    gap: 12,
    marginTop: 16,
    marginBottom: 24,
    paddingBottom: 20,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.orange,
  },
  syncButtonText: {
    color: colors.orange,
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.orange,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  testButtonText: {
    color: colors.white,
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  debugSection: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.orange,
    borderStyle: 'dashed',
  },
  debugSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.gray[800],
    marginBottom: 16,
    textAlign: 'center',
  },
  debugButtonsContainer: {
    gap: 12,
  },
  debugTestButton: {
    backgroundColor: colors.orange,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  debugTestButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  debugSyncButton: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: colors.orange,
  },
  debugSyncButtonText: {
    color: colors.orange,
    fontSize: 16,
    fontWeight: 'bold',
  },
  debugCheckButton: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: colors.blue[600],
  },
  debugCheckButtonText: {
    color: colors.blue[600],
    fontSize: 16,
    fontWeight: 'bold',
  },
  debugClearButton: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: colors.red[600],
  },
  debugClearButtonText: {
    color: colors.red[600],
    fontSize: 16,
    fontWeight: 'bold',
  },
     paymentOptionsContainer: {
     marginTop: 16,
   },
   paymentOptionsTitle: {
     fontSize: 18,
     fontWeight: 'bold',
     color: colors.white,
     marginBottom: 16,
     textAlign: 'center',
   },
   paymentButtonsContainer: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     marginBottom: 16,
     gap: 12,
   },
   paymentOptionButton: {
     flex: 1,
     backgroundColor: 'rgba(255, 255, 255, 0.2)',
     borderRadius: 16,
     padding: 20,
     alignItems: 'center',
     borderWidth: 2,
     borderColor: 'rgba(255, 255, 255, 0.3)',
   },
   paymentOptionContent: {
     alignItems: 'center',
   },
   paymentOptionTitle: {
     fontSize: 16,
     fontWeight: 'bold',
     color: colors.white,
     marginTop: 8,
     marginBottom: 4,
   },
   paymentOptionDescription: {
     fontSize: 12,
     color: colors.white,
     opacity: 0.8,
   },
   paymentOptionsNote: {
     fontSize: 14,
     color: colors.white,
     opacity: 0.9,
     textAlign: 'center',
     fontStyle: 'italic',
   },
}); 