import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { colors } from '@/styles/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import firebaseSalesService from '@/services/firebaseSales';
import { Order, OrderItem, DaySummary, PaymentMethodType } from '@/services/firebaseSales';

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
    color: colors.purple[600],
    bg: colors.purple[100]
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

export default function Caixa() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [daySummary, setDaySummary] = useState<DaySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar dados do Firebase quando a data mudar
  useEffect(() => {
    const fetchDaySales = async () => {
      try {
        setLoading(true);
        setError(null);
        const summary = await firebaseSalesService.getDaySales(selectedDate);
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
            <ActivityIndicator size="large" color={colors.purple[500]} />
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
                        // Verifica se o pedido tem todos os dados necessários
                        const safeOrder = {...order};
                        if (!safeOrder.items || !Array.isArray(safeOrder.items)) {
                          // Cria items vazios se não existir
                          safeOrder.items = [];
                        }
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
      <Modal
        visible={!!selectedOrder}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedOrder(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalhes do Pedido</Text>
              <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                <Ionicons name="close" size={24} color={colors.gray[600]} />
              </TouchableOpacity>
            </View>

            {selectedOrder ? (
              <ScrollView style={styles.modalScroll}>
                <View style={styles.timeInfo}>
                  <View style={styles.timeRow}>
                    <Ionicons name="time-outline" size={18} color={colors.gray[600]} />
                    <Text style={styles.timeText}>
                      Pedido: <Text>{formatTime(selectedOrder)}</Text>
                    </Text>
                  </View>
                  <View style={styles.timeRow}>
                    <Ionicons 
                      name={selectedOrder.status === 'delivered' ? 'checkmark-circle-outline' : 'alert-circle-outline'} 
                      size={18} 
                      color={selectedOrder.status === 'delivered' ? colors.green[600] : colors.red[500]} 
                    />
                    <Text style={styles.timeText}>
                      Status:{' '}
                      <Text>
                        {selectedOrder.status === 'delivered' ? 'Entregue' : 
                         selectedOrder.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
                      </Text>
                    </Text>
                  </View>
                </View>

                <View style={styles.customerSection}>
                  <Text style={styles.sectionText}>{selectedOrder.customerName || 'Cliente'}</Text>
                  {selectedOrder.customerAddress ? (
                    <Text style={styles.addressText}>{String(selectedOrder.customerAddress)}</Text>
                  ) : null}
                </View>

                <View style={styles.itemsContainer}>
                  <Text style={styles.modalSectionTitle}>Itens do Pedido:</Text>
                  {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((item) => (
                      <View key={String(item.id || Math.random())} style={styles.itemRow}>
                        <Text style={styles.itemQuantity}>
                          {Number(item.quantity || 0)}x
                        </Text>
                        <Text style={styles.itemName}>
                          {String(item.name || 'Item')}
                        </Text>
                        <Text style={styles.itemPrice}>
                          R$ {Number((Number(item.price) || 0) * (Number(item.quantity) || 0)).toFixed(2)}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyStateText}>Nenhum item encontrado</Text>
                  )}
                </View>

                {selectedOrder.deliveryFee && Number(selectedOrder.deliveryFee) > 0 ? (
                  <View style={styles.deliveryFeeContainer}>
                    <View style={styles.itemRow}>
                      <View style={styles.itemNameContainer}>
                        <Ionicons name="bicycle-outline" size={16} color={colors.gray[600]} style={styles.deliveryIcon} />
                        <Text style={styles.itemName}>Taxa de Entrega</Text>
                      </View>
                      <Text style={styles.itemPrice}>
                        R$ {Number(selectedOrder.deliveryFee).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* Valor após taxa de cartão */}
                {selectedOrder.finalPrice && selectedOrder.cardFeeValue && 
                  Number(selectedOrder.finalPrice) !== Number(selectedOrder.total) ? (
                  <View style={[styles.totalContainer]}>
                    <Text style={styles.totalLabel}>Total do Pedido</Text>
                    <Text style={styles.modalTotalValue}>
                      R$ {Number(selectedOrder.finalPrice).toFixed(2)}
                    </Text>
                  </View>
                ) : null}
                {/* Taxa de cartão */}
                {selectedOrder.cardFeeValue && Number(selectedOrder.cardFeeValue) > 0 ? (
                  <View style={styles.deliveryFeeContainer}>
                    <View style={styles.itemRow}>
                      <View style={styles.itemNameContainer}>
                        <Ionicons name="card-outline" size={16} color={colors.red[600]} style={styles.deliveryIcon} />
                        <Text style={styles.itemName}>Taxa de Cartão (descontada)</Text>
                      </View>
                      <Text style={[styles.itemPrice, { color: colors.red[600] }]}>
                        - R$ {Number(selectedOrder.cardFeeValue).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                ) : null}

                <View style={styles.totalContainer}>
                  <Text style={styles.totalLabel}>Valor Recebido (após taxa)</Text>
                  <Text style={styles.modalTotalValue}>
                    R$ {Number(selectedOrder.total || 0).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.paymentInfo}>
                  <Ionicons 
                    name={getPaymentInfo(selectedOrder.paymentMethod || 'cash', selectedOrder.paymentData).icon as any}
                    size={18} 
                    color={getPaymentInfo(selectedOrder.paymentMethod || 'cash', selectedOrder.paymentData).color}
                  />
                  <Text style={styles.paymentText}>
                    {getPaymentInfo(selectedOrder.paymentMethod || 'cash', selectedOrder.paymentData).name}
                  </Text>
                </View>
              </ScrollView>
            ) : (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Carregando detalhes...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
    color: colors.purple[500],
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
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
    fontWeight: '600',
    color: colors.gray[800],
  },
  modalScroll: {
    maxHeight: '100%',
  },
  timeInfo: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 14,
    color: colors.gray[700],
    marginLeft: 8,
  },
  customerSection: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[800],
  },
  addressText: {
    fontSize: 14,
    color: colors.gray[600],
    marginTop: 4,
  },
  itemsContainer: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  itemQuantity: {
    fontSize: 14,
    color: colors.gray[600],
    marginRight: 8,
    width: 30,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: colors.gray[800],
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray[800],
  },
  totalContainer: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[800],
  },
  modalTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[800],
  },
  paymentInfo: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentText: {
    fontSize: 14,
    color: colors.gray[800],
    marginLeft: 8,
  },
  deliveryFeeContainer: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  itemNameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryIcon: {
    marginRight: 8,
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
    backgroundColor: colors.purple[500],
    borderRadius: 8,
  },
  retryText: {
    color: colors.white,
    fontWeight: '500',
  },
}); 