import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  appFeeIds: string[];
  createdAt: Timestamp;
  cycleEnd: Timestamp;
  cycleStart: Timestamp;
  details: InvoiceDetail[];
  dueDate: Timestamp;
  paidAt: Timestamp | null;
  paymentStatus: 'pending' | 'paid' | 'overdue';
  status: string;
  storeId: string;
  totalFee: number;
  updatedAt: Timestamp;
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

export default function Faturas() {
  const [isLoading, setIsLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!user?.uid) return;
      
      setIsLoading(true);
      try {
        const invoicesRef = collection(db, 'partners', user.uid, 'invoices');
        const q = query(
          invoicesRef,
          orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const fetchedInvoices: Invoice[] = [];

        querySnapshot.forEach((doc) => {
          fetchedInvoices.push({
            id: doc.id,
            ...doc.data()
          } as Invoice);
        });

        setInvoices(fetchedInvoices);
        const pendingInvoice = fetchedInvoices.find(inv => inv.paymentStatus === 'pending');
        setCurrentInvoice(pendingInvoice || null);
      } catch (error) {
        console.error('Erro ao buscar faturas:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoices();
  }, [user?.uid]);

  const getStatusColor = (status: Invoice['paymentStatus']) => {
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

  const getStatusText = (status: Invoice['paymentStatus']) => {
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

  const handleInvoicePress = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDetailsModalVisible(true);
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

      <ScrollView style={styles.content}>
        {/* Fatura Atual */}
        {currentInvoice && (
          <View style={styles.currentInvoiceCard}>
            <View style={styles.currentInvoiceHeader}>
              <Ionicons name="receipt-outline" size={24} color={colors.gray[800]} />
              <Text style={styles.currentInvoiceTitle}>Fatura Atual</Text>
            </View>
            <View style={styles.currentInvoiceContent}>
              <Text style={styles.currentInvoiceMonth}>
                {getMonthYear(currentInvoice.cycleStart)}
              </Text>
              
              <View style={styles.summaryContainer}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Volume de Vendas</Text>
                    <Text style={styles.summaryValue}>
                      {formatCurrency(currentInvoice.totalFee)}
                    </Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Total de Pedidos</Text>
                    <Text style={styles.summaryValue}>
                      {currentInvoice.details.length}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Taxa do Sistema</Text>
                    <Text style={styles.summaryValue}>
                      {currentInvoice.details.reduce((total, detail) => total + detail.percentage, 0)}%
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total a Pagar</Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(currentInvoice.totalFee)}
                </Text>
              </View>
              
              <Text style={styles.currentInvoiceDueDate}>
                Vencimento: {formatDate(currentInvoice.dueDate)}
              </Text>
            </View>
            <TouchableOpacity style={styles.payButton}>
              <Text style={styles.payButtonText}>Pagar Fatura</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Histórico de Faturas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Histórico de Faturas</Text>
          <View style={styles.invoicesList}>
            {invoices.map((invoice) => (
              <TouchableOpacity
                key={invoice.id}
                style={styles.invoiceItem}
                onPress={() => handleInvoicePress(invoice)}
              >
                <View style={styles.invoiceInfo}>
                  <Text style={styles.invoiceMonth}>
                    {getMonthYear(invoice.cycleStart)}
                  </Text>
                  <Text style={styles.invoiceDueDate}>
                    Vencimento: {formatDate(invoice.dueDate)}
                  </Text>
                  {invoice.paidAt && (
                    <Text style={styles.invoicePaymentDate}>
                      Pago em: {formatDate(invoice.paidAt)}
                    </Text>
                  )}
                </View>
                <View style={styles.invoiceDetails}>
                  <Text style={styles.invoiceAmount}>
                    {formatCurrency(invoice.totalFee)}
                  </Text>
                  <Text style={[styles.invoiceStatus, { color: getStatusColor(invoice.paymentStatus) }]}>
                    {getStatusText(invoice.paymentStatus)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Modal de Detalhes */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailsModalVisible}
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalhes da Fatura</Text>
              <TouchableOpacity 
                onPress={() => setDetailsModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.gray[800]} />
              </TouchableOpacity>
            </View>

            {selectedInvoice && (
              <>
                <Text style={styles.modalMonth}>
                  {getMonthYear(selectedInvoice.cycleStart)}
                </Text>

                <View style={styles.summaryContainer}>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Volume de Vendas</Text>
                      <Text style={styles.summaryValue}>
                        {formatCurrency(selectedInvoice.totalFee)}
                      </Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Total de Pedidos</Text>
                      <Text style={styles.summaryValue}>
                        {selectedInvoice.details.length}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Taxa do Sistema</Text>
                      <Text style={styles.summaryValue}>
                        {selectedInvoice.details.reduce((total, detail) => total + detail.percentage, 0)}%
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.modalInfoContainer}>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Status:</Text>
                    <Text style={[
                      styles.modalInfoValue,
                      { color: getStatusColor(selectedInvoice.paymentStatus) }
                    ]}>
                      {getStatusText(selectedInvoice.paymentStatus)}
                    </Text>
                  </View>

                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Vencimento:</Text>
                    <Text style={styles.modalInfoValue}>{formatDate(selectedInvoice.dueDate)}</Text>
                  </View>

                  {selectedInvoice.paidAt && (
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalInfoLabel}>Pago em:</Text>
                      <Text style={styles.modalInfoValue}>{formatDate(selectedInvoice.paidAt)}</Text>
                    </View>
                  )}

                  <View style={styles.totalContainer}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>
                      {formatCurrency(selectedInvoice.totalFee)}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[100],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 3,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[800],
    marginLeft: 16,
    marginRight: 16,
  },
  backButton: {
    padding: 8,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  currentInvoiceCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  currentInvoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  currentInvoiceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[800],
  },
  currentInvoiceContent: {
    alignItems: 'center',
    width: '100%',
  },
  currentInvoiceMonth: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[800],
    marginBottom: 8,
  },
  currentInvoiceAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.gray[800],
    marginBottom: 8,
  },
  currentInvoiceDueDate: {
    fontSize: 16,
    color: colors.gray[600],
  },
  payButton: {
    backgroundColor: colors.orange,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  payButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[800],
    marginBottom: 16,
  },
  invoicesList: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  invoiceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceMonth: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: 4,
  },
  invoiceDueDate: {
    fontSize: 14,
    color: colors.gray[600],
    marginBottom: 2,
  },
  invoicePaymentDate: {
    fontSize: 14,
    color: colors.gray[600],
  },
  invoiceDetails: {
    alignItems: 'flex-end',
  },
  invoiceAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: 4,
  },
  invoiceStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryContainer: {
    width: '100%',
    marginVertical: 16,
    backgroundColor: colors.gray[100],
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.gray[600],
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[800],
  },
  totalContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[700],
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.orange,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[800],
  },
  
  closeButton: {
    padding: 8,
  },
  
  modalMonth: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.gray[800],
    marginBottom: 24,
    textAlign: 'center',
  },
  
  modalInfoContainer: {
    marginTop: 24,
  },
  
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  modalInfoLabel: {
    fontSize: 16,
    color: colors.gray[600],
  },
  
  modalInfoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[800],
  },
}); 