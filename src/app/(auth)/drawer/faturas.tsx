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

interface InvoiceSummary {
  totalOrders: number;
  totalSales: number;
  totalDiscounts: number;
  percentageFee: number;
  calculatedFee: number;
}

interface Invoice {
  id: string;
  month: string;
  year: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  paymentDate?: string;
  summary: InvoiceSummary;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export default function Faturas() {
  const [isLoading, setIsLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  const router = useRouter();
  const navigation = useNavigation();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockInvoices: Invoice[] = [
        {
          id: '1',
          month: 'Janeiro',
          year: '2024',
          amount: 1840.00,
          dueDate: '10/01/2024',
          status: 'paid',
          paymentDate: '09/01/2024',
          summary: {
            totalOrders: 380,
            totalSales: 23000.00,
            totalDiscounts: 800.00,
            percentageFee: 8,
            calculatedFee: 1840.00,
          }
        },
        {
          id: '2',
          month: 'Fevereiro',
          year: '2024',
          amount: 2080.00,
          dueDate: '10/02/2024',
          status: 'paid',
          paymentDate: '08/02/2024',
          summary: {
            totalOrders: 410,
            totalSales: 26000.00,
            totalDiscounts: 1000.00,
            percentageFee: 8,
            calculatedFee: 2080.00,
          }
        },
        {
          id: '3',
          month: 'Março',
          year: '2024',
          amount: 2280.00,
          dueDate: '10/03/2024',
          status: 'pending',
          summary: {
            totalOrders: 450,
            totalSales: 28500.00,
            totalDiscounts: 1200.00,
            percentageFee: 8,
            calculatedFee: 2280.00,
          }
        },
      ];

      setInvoices(mockInvoices);
      setCurrentInvoice(mockInvoices.find(inv => inv.status === 'pending') || null);
      setIsLoading(false);
    };

    fetchData();
  }, []);


  const getStatusColor = (status: Invoice['status']) => {
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

  const getStatusText = (status: Invoice['status']) => {
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
                {currentInvoice.month} {currentInvoice.year}
              </Text>
              
              <View style={styles.summaryContainer}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Volume de Vendas</Text>
                    <Text style={styles.summaryValue}>
                      {formatCurrency(currentInvoice.summary.totalSales)}
                    </Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Total de Pedidos</Text>
                    <Text style={styles.summaryValue}>
                      {currentInvoice.summary.totalOrders}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Descontos Aplicados</Text>
                    <Text style={styles.summaryValue}>
                      {formatCurrency(currentInvoice.summary.totalDiscounts)}
                    </Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Taxa do Sistema</Text>
                    <Text style={styles.summaryValue}>
                      {currentInvoice.summary.percentageFee}%
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total a Pagar</Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(currentInvoice.amount)}
                </Text>
              </View>
              
              <Text style={styles.currentInvoiceDueDate}>
                Vencimento: {currentInvoice.dueDate}
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
                    {invoice.month} {invoice.year}
                  </Text>
                  <Text style={styles.invoiceDueDate}>
                    Vencimento: {invoice.dueDate}
                  </Text>
                  {invoice.paymentDate && (
                    <Text style={styles.invoicePaymentDate}>
                      Pago em: {invoice.paymentDate}
                    </Text>
                  )}
                </View>
                <View style={styles.invoiceDetails}>
                  <Text style={styles.invoiceAmount}>
                    {formatCurrency(invoice.amount)}
                  </Text>
                  <Text style={[styles.invoiceStatus, { color: getStatusColor(invoice.status) }]}>
                    {getStatusText(invoice.status)}
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
                  {selectedInvoice.month} {selectedInvoice.year}
                </Text>

                <View style={styles.summaryContainer}>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Volume de Vendas</Text>
                      <Text style={styles.summaryValue}>
                        {formatCurrency(selectedInvoice.summary.totalSales)}
                      </Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Total de Pedidos</Text>
                      <Text style={styles.summaryValue}>
                        {selectedInvoice.summary.totalOrders}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Descontos Aplicados</Text>
                      <Text style={styles.summaryValue}>
                        {formatCurrency(selectedInvoice.summary.totalDiscounts)}
                      </Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Taxa do Sistema</Text>
                      <Text style={styles.summaryValue}>
                        {selectedInvoice.summary.percentageFee}%
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.modalInfoContainer}>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Status:</Text>
                    <Text style={[
                      styles.modalInfoValue,
                      { color: getStatusColor(selectedInvoice.status) }
                    ]}>
                      {getStatusText(selectedInvoice.status)}
                    </Text>
                  </View>

                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Vencimento:</Text>
                    <Text style={styles.modalInfoValue}>{selectedInvoice.dueDate}</Text>
                  </View>

                  {selectedInvoice.paymentDate && (
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalInfoLabel}>Pago em:</Text>
                      <Text style={styles.modalInfoValue}>{selectedInvoice.paymentDate}</Text>
                    </View>
                  )}

                  <View style={styles.totalContainer}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>
                      {formatCurrency(selectedInvoice.amount)}
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