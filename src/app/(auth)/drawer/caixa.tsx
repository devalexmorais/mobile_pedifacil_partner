import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { colors } from '@/styles/theme/colors';
import { Ionicons } from '@expo/vector-icons';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface OrderSummary {
  id: string;
  time: string;
  total: number;
  paymentMethod: 'cash' | 'card' | 'pix';
  itemsCount: number;
}

interface DaySummary {
  date: string;
  total: number;
  orders: number;
  cash: number;
  card: number;
  pix: number;
  ordersList: OrderSummary[];
}

interface OrderDetails extends Omit<OrderSummary, 'itemsCount'> {
  customer: string;
  address?: string;
  items: OrderItem[];
  deliveryFee?: number;
  status: 'delivered' | 'cancelled';
}

export default function Caixa() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);

  // Função para gerar números consistentes baseados na data
  const generateDayValues = (date: Date) => {
    // Cria uma string única para cada data
    const dateString = date.toISOString().split('T')[0];
    
    // Função para gerar número "aleatório" consistente
    const getRandomNumber = (min: number, max: number, seed: string) => {
      const hash = dateString.split('').reduce((acc, char) => {
        return char.charCodeAt(0) + ((acc << 5) - acc);
      }, 0);
      const normalized = (Math.sin(hash) + 1) / 2;
      return Math.floor(min + normalized * (max - min));
    };

    // Gera valores para o dia
    const total = getRandomNumber(500, 2500, dateString + 'total');
    const orders = getRandomNumber(5, 40, dateString + 'orders');
    const cash = getRandomNumber(100, total * 0.4, dateString + 'cash');
    const pix = getRandomNumber(100, total * 0.4, dateString + 'pix');
    const card = total - cash - pix;

    // Gera lista de pedidos
    const ordersList: OrderSummary[] = [];
    const numOrders = orders;
    
    for (let i = 0; i < numOrders; i++) {
      const orderTotal = getRandomNumber(20, 150, dateString + `order${i}`);
      const hour = getRandomNumber(10, 22, dateString + `hour${i}`);
      const minute = getRandomNumber(0, 59, dateString + `minute${i}`);
      
      const paymentMethods: Array<'cash' | 'card' | 'pix'> = ['cash', 'card', 'pix'];
      const paymentMethod = paymentMethods[getRandomNumber(0, 3, dateString + `payment${i}`)];
      
      ordersList.push({
        id: `${dateString}-${i}`,
        time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
        total: orderTotal,
        paymentMethod,
        itemsCount: getRandomNumber(1, 6, dateString + `items${i}`),
      });
    }

    // Ordena pedidos por horário (mais recente primeiro)
    ordersList.sort((a, b) => b.time.localeCompare(a.time));

    return {
      date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      total,
      orders,
      cash,
      card,
      pix,
      ordersList,
    };
  };

  const getDaySummary = (date: Date): DaySummary => {
    return generateDayValues(date);
  };

  const currentDayData = getDaySummary(selectedDate);

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return { 
          name: 'cash-outline',
          color: colors.green[600],
          bg: colors.green[100]
        };
      case 'card':
        return { 
          name: 'card-outline',
          color: colors.blue[600],
          bg: colors.blue[100]
        };
      case 'pix':
        return { 
          name: 'phone-portrait-outline',
          color: colors.purple[600],
          bg: colors.purple[100]
        };
      default:
        return { 
          name: 'cash-outline',
          color: colors.gray[600],
          bg: colors.gray[100]
        };
    }
  };

  // Função para gerar detalhes do pedido
  const getOrderDetails = (order: OrderSummary): OrderDetails => {
    const dateString = selectedDate.toISOString().split('T')[0];
    const getRandomNumber = (min: number, max: number, seed: string) => {
      const hash = (dateString + seed).split('').reduce((acc, char) => {
        return char.charCodeAt(0) + ((acc << 5) - acc);
      }, 0);
      const normalized = (Math.sin(hash) + 1) / 2;
      return Math.floor(min + normalized * (max - min));
    };

    const items = [];
    const itemsCount = getRandomNumber(1, 5, order.id + 'items');
    
    const menuItems = [
      { name: 'X-Burger', basePrice: 25 },
      { name: 'X-Bacon', basePrice: 28 },
      { name: 'X-Tudo', basePrice: 32 },
      { name: 'Refrigerante', basePrice: 8 },
      { name: 'Batata Frita', basePrice: 15 },
    ];

    for (let i = 0; i < itemsCount; i++) {
      const menuItem = menuItems[getRandomNumber(0, menuItems.length, order.id + `item${i}`)];
      items.push({
        id: `${order.id}-item-${i}`,
        name: menuItem.name,
        quantity: getRandomNumber(1, 3, order.id + `qty${i}`),
        price: menuItem.basePrice,
      });
    }

    return {
      ...order,
      customer: 'Cliente ' + getRandomNumber(1, 999, order.id + 'customer'),
      address: order.paymentMethod === 'cash' ? 'Rua Example, 123' : undefined,
      items,
      deliveryFee: order.paymentMethod === 'cash' ? getRandomNumber(5, 15, order.id + 'delivery') : undefined,
      status: getRandomNumber(0, 10, order.id + 'status') > 1 ? 'delivered' : 'cancelled',
    };
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
              {isToday(selectedDate) ? 'Hoje' : currentDayData.date}
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

        {/* Resumo do Dia */}
        <View style={styles.summary}>
          <Text style={styles.summaryValue}>
            R$ {currentDayData.total.toFixed(2)}
          </Text>
          <Text style={styles.ordersText}>
            {currentDayData.orders} pedidos
          </Text>
        </View>

        {/* Detalhamento por Forma de Pagamento */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Formas de Pagamento</Text>
          
          <View style={styles.paymentGrid}>
            <View style={styles.paymentCard}>
              <View style={[styles.paymentIcon, { backgroundColor: colors.green[100] }]}>
                <Ionicons name="cash-outline" size={24} color={colors.green[600]} />
              </View>
              <Text style={styles.paymentValue}>R$ {currentDayData.cash.toFixed(2)}</Text>
              <Text style={styles.paymentLabel}>Dinheiro</Text>
            </View>

            <View style={styles.paymentCard}>
              <View style={[styles.paymentIcon, { backgroundColor: colors.blue[100] }]}>
                <Ionicons name="card-outline" size={24} color={colors.blue[600]} />
              </View>
              <Text style={styles.paymentValue}>R$ {currentDayData.card.toFixed(2)}</Text>
              <Text style={styles.paymentLabel}>Cartão</Text>
            </View>

            <View style={styles.paymentCard}>
              <View style={[styles.paymentIcon, { backgroundColor: colors.purple[100] }]}>
                <Ionicons name="phone-portrait-outline" size={24} color={colors.purple[600]} />
              </View>
              <Text style={styles.paymentValue}>R$ {currentDayData.pix.toFixed(2)}</Text>
              <Text style={styles.paymentLabel}>PIX</Text>
            </View>
          </View>
        </View>

        {/* Histórico de Vendas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Histórico de Vendas</Text>
          
          {currentDayData.ordersList.length > 0 ? (
            <View style={styles.ordersList}>
              {currentDayData.ordersList.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  style={styles.orderCard}
                  onPress={() => setSelectedOrder(getOrderDetails(order))}
                >
                  <View style={styles.orderHeader}>
                    <View style={[
                      styles.orderPaymentIcon,
                      { backgroundColor: getPaymentIcon(order.paymentMethod).bg }
                    ]}>
                      <Ionicons 
                        name={getPaymentIcon(order.paymentMethod).name as any}
                        size={16}
                        color={getPaymentIcon(order.paymentMethod).color}
                      />
                    </View>
                    <Text style={styles.orderTime}>{order.time}</Text>
                  </View>
                  
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderItems}>
                      {order.itemsCount} {order.itemsCount === 1 ? 'item' : 'itens'}
                    </Text>
                    <Text style={styles.orderValue}>
                      R$ {order.total.toFixed(2)}
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

            {selectedOrder && (
              <ScrollView style={styles.modalScroll}>
                <View style={styles.timeInfo}>
                  <View style={styles.timeRow}>
                    <Ionicons name="time-outline" size={18} color={colors.gray[600]} />
                    <Text style={styles.timeText}>Pedido: {selectedOrder.time}</Text>
                  </View>
                  <View style={styles.timeRow}>
                    <Ionicons name="checkmark-circle-outline" size={18} color={colors.green[600]} />
                    <Text style={styles.timeText}>
                      Status: {selectedOrder.status === 'delivered' ? 'Entregue' : 'Cancelado'}
                    </Text>
                  </View>
                </View>

                <View style={styles.customerSection}>
                  <Text style={styles.sectionText}>{selectedOrder.customer}</Text>
                  {selectedOrder.address && (
                    <Text style={styles.addressText}>{selectedOrder.address}</Text>
                  )}
                </View>

                <View style={styles.itemsContainer}>
                  <Text style={styles.modalSectionTitle}>Itens do Pedido:</Text>
                  {selectedOrder.items.map((item) => (
                    <View key={item.id} style={styles.itemRow}>
                      <Text style={styles.itemQuantity}>{item.quantity}x</Text>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemPrice}>
                        R$ {(item.price * item.quantity).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>

                {selectedOrder.deliveryFee && (
                  <View style={styles.deliveryFeeContainer}>
                    <View style={styles.itemRow}>
                      <View style={styles.itemNameContainer}>
                        <Ionicons name="bicycle-outline" size={16} color={colors.gray[600]} style={styles.deliveryIcon} />
                        <Text style={styles.itemName}>Taxa de Entrega</Text>
                      </View>
                      <Text style={styles.itemPrice}>
                        R$ {selectedOrder.deliveryFee.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.totalContainer}>
                  <Text style={styles.totalLabel}>Total do Pedido</Text>
                  <Text style={styles.modalTotalValue}>
                    R$ {selectedOrder.total.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.paymentInfo}>
                  <Ionicons 
                    name={getPaymentIcon(selectedOrder.paymentMethod).name as any}
                    size={18} 
                    color={getPaymentIcon(selectedOrder.paymentMethod).color}
                  />
                  <Text style={styles.paymentText}>
                    {selectedOrder.paymentMethod === 'cash' ? 'Dinheiro' :
                     selectedOrder.paymentMethod === 'card' ? 'Cartão' : 'PIX'}
                  </Text>
                </View>
              </ScrollView>
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
}); 