import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { colors } from '@/styles/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import firebaseSalesService from '@/services/firebaseSales';
import { Order, OrderItem, DaySummary, PaymentMethodType } from '@/services/firebaseSales';
import OrderDetailsModal from '@/components/OrderDetailsModal';

// Mapeamento centralizado dos métodos de pagamento
const PAYMENT_METHODS = {
  cash: {
    id: 'cash',
    name: 'Dinheiro',
    icon: 'cash-outline' as const,
    color: colors.green[600],
    bg: colors.green[100]
  },
  card: {
    id: 'card',
    name: 'Cartão',
    icon: 'card-outline' as const,
    color: colors.blue[600],
    bg: colors.blue[100]
  },
  pix: {
    id: 'pix',
    name: 'PIX',
    icon: 'phone-portrait-outline' as const,
    color: colors.orange,
    bg: colors.gray[100]
  }
};

// Mapeamento de bandeiras de cartão
const CARD_FLAGS: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  elo: 'Elo',
  amex: 'American Express',
  hipercard: 'Hipercard'
};

// Função para obter informações do método de pagamento
const getPaymentInfo = (method: string | undefined, paymentData?: any) => {
  // Garantir que o método exista no mapeamento, ou retornar dinheiro como padrão
  const paymentKey = method && PAYMENT_METHODS[method as keyof typeof PAYMENT_METHODS] 
    ? method as keyof typeof PAYMENT_METHODS
    : 'cash';
    
  const paymentInfo = { ...PAYMENT_METHODS[paymentKey] };
  
  // Se for cartão e tiver bandeira nos dados originais, adicionar ao nome
  if (paymentKey === 'card' && paymentData && typeof paymentData === 'object') {
    const flag = paymentData.flag || paymentData.payment?.flag;
    if (flag && CARD_FLAGS[flag]) {
      paymentInfo.name = `${paymentInfo.name} ${CARD_FLAGS[flag]}`;
    } else if (paymentData.method === 'credit') {
      paymentInfo.name = `${paymentInfo.name} (Crédito)`;
    } else if (paymentData.method === 'debit') {
      paymentInfo.name = `${paymentInfo.name} (Débito)`;
    }
  }
  
  return paymentInfo;
};

// Adicionar uma função auxiliar para extrair userName do daySummary quando o pedido é selecionado
const findOrderWithDetails = (orderId: string, ordersList: Order[]): Order | null => {
  const foundOrder = ordersList?.find(order => order.id === orderId);
  if (foundOrder) {
    console.log('ENCONTROU PEDIDO COMPLETO:', JSON.stringify(foundOrder, null, 2));
    return foundOrder;
  }
  return null;
};

export default function Caixa() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [daySummary, setDaySummary] = useState<DaySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Efeito para registrar os dados do pedido selecionado
  useEffect(() => {
    if (selectedOrder) {
      console.log('DADOS DO PEDIDO COMPLETOS:', JSON.stringify(selectedOrder, null, 2));
      console.log('DADOS DO CLIENTE:', JSON.stringify({
        userName: selectedOrder.userName,
        customerName: selectedOrder.customerName
      }, null, 2));
    }
  }, [selectedOrder]);

  // Buscar dados do Firebase quando a data mudar
  useEffect(() => {
    const fetchDaySales = async () => {
      try {
        setLoading(true);
        setError(null);
        const summary = await firebaseSalesService.getDaySales(selectedDate);
        
        // Inspecionar os dados recebidos
        if (summary && Array.isArray(summary.ordersList) && summary.ordersList.length > 0) {
          console.log('AMOSTRA DE PEDIDO:', JSON.stringify(summary.ordersList[0], null, 2));
        }
        
        setDaySummary(summary);
      } catch (err) {
        console.error('Erro ao buscar vendas:', err);
        setError('Falha ao carregar os dados de vendas');
      } finally {
        setLoading(false);
      }
    };

    fetchDaySales();
  }, [selectedDate]);

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Função para formatar a hora de um timestamp
  const formatTime = (order: Order): string => {
    try {
      if (!order || !order.createdAt) return 'Sem data';
      
      // Verifica se createdAt é um Timestamp válido com método toDate
      if (typeof order.createdAt.toDate !== 'function') {
        return 'Data inválida';
      }
      
      const date = order.createdAt.toDate();
      if (!date || isNaN(date.getTime())) return 'Data inválida';
      
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return 'Data inválida';
    }
  };



  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Seletor de Data */}
        <View style={styles.dateSelector}>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => changeDate(-1)}
          >
            <Ionicons name="chevron-back" size={24} color={colors.gray[600]} />
          </TouchableOpacity>
          
          <View style={styles.dateContainer}>
            <Text style={styles.dateLabel}>
              {isToday(selectedDate) ? 'Hoje' : daySummary?.date || ''}
            </Text>
            {!isToday(selectedDate) && (
              <TouchableOpacity 
                style={styles.todayButton}
                onPress={() => setSelectedDate(new Date())}
              >
                <Text style={styles.todayText}>Voltar para hoje</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => changeDate(1)}
            disabled={isToday(selectedDate)}
          >
            <Ionicons 
              name="chevron-forward" 
              size={24} 
              color={isToday(selectedDate) ? colors.gray[300] : colors.gray[600]} 
            />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.orange} />
            <Text style={styles.loadingText}>Carregando dados...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={40} color={colors.red[500]} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => {
                setSelectedDate(new Date(selectedDate));
              }}
            >
              <Text style={styles.retryText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Resumo do Dia */}
            <View style={styles.summary}>
              <Text style={styles.summaryValue}>
                R$ {(daySummary?.total ? Number(daySummary.total) : 0).toFixed(2)}
              </Text>
              <Text style={styles.ordersText}>
                {daySummary?.orders || 0} pedidos
              </Text>
            </View>

            {/* Detalhamento por Forma de Pagamento */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Formas de Pagamento</Text>
              
              <View style={styles.paymentGrid}>
                <View style={styles.paymentCard}>
                  <View style={[styles.paymentIcon, { backgroundColor: PAYMENT_METHODS.cash.bg }]}>
                    <Ionicons name={PAYMENT_METHODS.cash.icon} size={24} color={PAYMENT_METHODS.cash.color} />
                  </View>
                  <Text style={styles.paymentValue}>
                    R$ {(daySummary?.cash ? Number(daySummary.cash) : 0).toFixed(2)}
                  </Text>
                  <Text style={styles.paymentLabel}>{PAYMENT_METHODS.cash.name}</Text>
                </View>

                <View style={styles.paymentCard}>
                  <View style={[styles.paymentIcon, { backgroundColor: PAYMENT_METHODS.card.bg }]}>
                    <Ionicons name={PAYMENT_METHODS.card.icon} size={24} color={PAYMENT_METHODS.card.color} />
                  </View>
                  <Text style={styles.paymentValue}>
                    R$ {(daySummary?.card ? Number(daySummary.card) : 0).toFixed(2)}
                  </Text>
                  <Text style={styles.paymentLabel}>{PAYMENT_METHODS.card.name}</Text>
                </View>

                <View style={styles.paymentCard}>
                  <View style={[styles.paymentIcon, { backgroundColor: PAYMENT_METHODS.pix.bg }]}>
                    <Ionicons name={PAYMENT_METHODS.pix.icon} size={24} color={PAYMENT_METHODS.pix.color} />
                  </View>
                  <Text style={styles.paymentValue}>
                    R$ {(daySummary?.pix ? Number(daySummary.pix) : 0).toFixed(2)}
                  </Text>
                  <Text style={styles.paymentLabel}>{PAYMENT_METHODS.pix.name}</Text>
                </View>
              </View>
            </View>

            {/* Histórico de Vendas */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Histórico de Vendas</Text>
              
              {daySummary?.ordersList && Array.isArray(daySummary.ordersList) && daySummary.ordersList.length > 0 ? (
                <View style={styles.ordersList}>
                  {daySummary.ordersList
                    .filter(order => order.status !== 'cancelled')
                    .map((order) => (
                    <TouchableOpacity
                      key={String(order.id || Math.random())}
                      style={styles.orderCard}
                      onPress={() => {
                        // Recuperar o pedido completo com todos os detalhes
                        const detailedOrder = findOrderWithDetails(order.id, daySummary?.ordersList || []) || order;
                        
                        // Verificar se o pedido tem todos os dados necessários
                        const safeOrder = {...detailedOrder};
                        if (!safeOrder.items || !Array.isArray(safeOrder.items)) {
                          // Cria items vazios se não existir
                          safeOrder.items = [];
                        }
                        
                        // Inspecionar especificamente o userName e outros dados importantes
                        console.log(`PEDIDO ${safeOrder.id} SELECIONADO:`, JSON.stringify({
                          userName: safeOrder.userName,
                          customerName: safeOrder.customerName
                        }, null, 2));
                        
                        setSelectedOrder(safeOrder);
                      }}
                    >
                      <View style={styles.orderHeader}>
                        <View style={[
                          styles.orderPaymentIcon,
                          { backgroundColor: getPaymentInfo(order.paymentMethod || 'cash', order.paymentData).bg }
                        ]}>
                          <Ionicons 
                            name={getPaymentInfo(order.paymentMethod || 'cash', order.paymentData).icon as any}
                            size={16}
                            color={getPaymentInfo(order.paymentMethod || 'cash', order.paymentData).color}
                          />
                        </View>
                        <Text style={styles.orderTime}>{formatTime(order)}</Text>
                      </View>
                      
                      <View style={styles.orderInfo}>
                        <Text style={styles.orderItems}>
                          {Array.isArray(order.items) ? order.items.length : 0}{' '}
                          <Text>
                            {Array.isArray(order.items) && order.items.length === 1 ? 'item' : 'itens'}
                          </Text>
                        </Text>
                        <Text style={styles.orderValue}>
                          R$ {Number(order.total || 0).toFixed(2)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    Nenhuma venda registrada neste dia
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Modal de Detalhes do Pedido */}
      <OrderDetailsModal
        visible={!!selectedOrder}
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[100],
  },
  content: {
    flex: 1,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  dateButton: {
    padding: 8,
  },
  dateContainer: {
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[800],
  },
  todayButton: {
    marginTop: 4,
  },
  todayText: {
    fontSize: 12,
    color: colors.orange,
    fontWeight: '500',
  },
  summary: {
    padding: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.gray[800],
    marginBottom: 4,
  },
  ordersText: {
    fontSize: 14,
    color: colors.gray[600],
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: 16,
  },
  paymentGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  paymentCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: 4,
  },
  paymentLabel: {
    fontSize: 12,
    color: colors.gray[600],
  },
  ordersList: {
    gap: 12,
  },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderPaymentIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  orderTime: {
    fontSize: 14,
    color: colors.gray[600],
    fontWeight: '500',
  },
  orderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderItems: {
    fontSize: 14,
    color: colors.gray[600],
  },
  orderValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[800],
  },
  emptyState: {
    padding: 24,
    backgroundColor: colors.gray[100],
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.gray[600],
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.gray[600],
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.gray[700],
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.orange,
    borderRadius: 8,
  },
  retryText: {
    color: colors.white,
    fontWeight: '500',
  },
}); 