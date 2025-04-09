import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Share } from 'react-native';
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

  const handleShareReceipt = async (order: Order) => {
    try {
      const receiptText = `
PEDIFÁCIL - RECIBO DE PEDIDO
--------------------------------
Número do Pedido: ${order.id || 'N/A'}
Data: ${formatTime(order)}
Status: ${order.status === 'delivered' ? 'Entregue' : 
         order.status === 'cancelled' ? 'Cancelado' : 'Pendente'}

CLIENTE
--------------------------------
Nome: ${order.userName || order.customerName || 'Não informado'}
Endereço: ${order.customerAddress || 'Não informado'}
Telefone: ${order.customerPhone || 'Não informado'}

ITENS DO PEDIDO
--------------------------------
${Array.isArray(order.items) ? order.items.map(item => 
  `${item.quantity}x ${item.name} - R$ ${(Number(item.price) * Number(item.quantity)).toFixed(2)}`
).join('\n') : 'Nenhum item'}

${order.deliveryFee ? `Taxa de Entrega: R$ ${Number(order.deliveryFee).toFixed(2)}\n` : ''}
${order.cardFeeValue ? `Taxa de Cartão: R$ ${Number(order.cardFeeValue).toFixed(2)}\n` : ''}

TOTAL
--------------------------------
Subtotal: R$ ${Number(order.total).toFixed(2)}
${order.finalPrice && order.finalPrice !== order.total ? 
  `Total Final: R$ ${Number(order.finalPrice).toFixed(2)}` : ''}

FORMA DE PAGAMENTO
--------------------------------
${getPaymentInfo(order.paymentMethod || 'cash', order.paymentData).name}

ESTABELECIMENTO
--------------------------------
PediFácil Partner
${order.storeName ? `\n${order.storeName}` : ''}
${order.storeAddress ? `\n${order.storeAddress}` : ''}
${order.storePhone ? `\n${order.storePhone}` : ''}
${order.storeCNPJ ? `\nCNPJ: ${order.storeCNPJ}` : ''}
`;

      await Share.share({
        message: receiptText,
        title: 'Recibo do Pedido',
      });
    } catch (error) {
      console.error('Erro ao compartilhar recibo:', error);
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
      <Modal
        visible={!!selectedOrder}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setSelectedOrder(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                onPress={() => setSelectedOrder(null)}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color={colors.gray[600]} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Detalhes do Pedido</Text>
              <TouchableOpacity 
                onPress={() => selectedOrder && handleShareReceipt(selectedOrder)}
                style={styles.shareButton}
              >
                <Ionicons name="print-outline" size={24} color={colors.gray[600]} />
              </TouchableOpacity>
            </View>

            {selectedOrder ? (
              <ScrollView style={styles.modalScroll}>
                <View style={styles.orderInfoCard}>
                  <View style={[
                    styles.orderStatusBadge,
                    {
                      backgroundColor: selectedOrder.status === 'delivered' 
                        ? colors.green[50] 
                        : selectedOrder.status === 'cancelled' 
                          ? colors.red[50] 
                          : colors.yellow[50],
                      borderColor: selectedOrder.status === 'delivered' 
                        ? colors.green[200] 
                        : selectedOrder.status === 'cancelled' 
                          ? colors.red[200] 
                          : colors.yellow[200],
                    }
                  ]}>
                    <Ionicons 
                      name={selectedOrder.status === 'delivered' ? 'checkmark-circle' : 
                           selectedOrder.status === 'cancelled' ? 'close-circle' : 'time'} 
                      size={20} 
                      color={selectedOrder.status === 'delivered' ? colors.green[600] : 
                           selectedOrder.status === 'cancelled' ? colors.red[600] : colors.yellow[600]} 
                    />
                    <Text style={[
                      styles.orderStatusText,
                      { 
                        color: selectedOrder.status === 'delivered' ? colors.green[600] : 
                             selectedOrder.status === 'cancelled' ? colors.red[600] : colors.yellow[600]
                      }
                    ]}>
                      {selectedOrder.status === 'delivered' ? 'Entregue' : 
                       selectedOrder.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
                    </Text>
                  </View>
                
                  <View style={styles.orderInfoRow}>
                    <Ionicons name="receipt-outline" size={18} color={colors.gray[600]} />
                    <Text style={styles.orderInfoText}>
                      Pedido #{selectedOrder.id || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.orderInfoRow}>
                    <Ionicons name="time-outline" size={18} color={colors.gray[600]} />
                    <Text style={styles.orderInfoText}>
                      {formatTime(selectedOrder)}
                    </Text>
                  </View>
                  
                  {/* Tipo de entrega */}
                  <View style={styles.orderInfoRow}>
                    <Ionicons 
                      name={selectedOrder.deliveryMode === 'delivery' ? 'bicycle-outline' : 'walk-outline'} 
                      size={18} 
                      color={colors.gray[600]} 
                    />
                    <Text style={styles.orderInfoText}>
                      {selectedOrder.deliveryMode === 'delivery' ? 'Entrega' : 'Retirada no local'}
                    </Text>
                  </View>
                </View>

                <View style={styles.customerSection}>
                  <Text style={styles.sectionText}>Informações do Cliente</Text>
                  <Text style={styles.customerName}>
                    {selectedOrder.userName || selectedOrder.customerName || 'Cliente não identificado'}
                  </Text>
                  {selectedOrder.customerPhone && (
                    <Text style={styles.addressText}>Tel: {selectedOrder.customerPhone}</Text>
                  )}
                  {selectedOrder.customerAddress && (
                    <Text style={styles.addressText}>{String(selectedOrder.customerAddress)}</Text>
                  )}
                  
                  {selectedOrder.address && selectedOrder.address.street && (
                    <View style={styles.fullAddressContainer}>
                      <Text style={styles.addressLabel}>Endereço de entrega:</Text>
                      <Text style={styles.addressText}>
                        {selectedOrder.address.street || ''}, {selectedOrder.address.number || ''}
                        {selectedOrder.address.complement ? `, ${selectedOrder.address.complement}` : ''}
                      </Text>
                      <Text style={styles.addressText}>
                        {selectedOrder.address.neighborhood || ''}, {selectedOrder.address.city || ''} - {selectedOrder.address.state || ''}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.itemsContainer}>
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons name="restaurant-outline" size={20} color={colors.purple[600]} />
                    <Text style={styles.modalSectionTitle}>Itens do Pedido</Text>
                  </View>
                  {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((item) => (
                      <View key={String(item.id || Math.random())} style={styles.detailedItemCard}>
                        <View style={styles.itemHeader}>
                          <View style={styles.itemQuantityBadge}>
                            <Text style={styles.itemQuantityText}>{Number(item.quantity || 0)}x</Text>
                          </View>
                          <Text style={styles.itemTitle}>
                            {String(item.name || 'Item')}
                          </Text>
                          <Text style={styles.itemPriceText}>
                            R$ {Number((Number(item.price) || 0) * (Number(item.quantity) || 0)).toFixed(2)}
                          </Text>
                        </View>
                        
                        {/* Extras e opções */}
                        <View style={styles.itemDetailsContainer}>
                          {item.options && Array.isArray(item.options) && item.options.length > 0 && (
                            <View style={styles.optionsContainer}>
                              <Text style={styles.optionsTitle}>Extras:</Text>
                              {item.options.map((option, index) => option && (
                                <View key={index} style={styles.optionRow}>
                                  <Text style={styles.optionName}>• {option.name || 'Extra'}</Text>
                                  <Text style={styles.optionPrice}>
                                    {option.price && Number(option.price) > 0 ? `+ R$ ${Number(option.price).toFixed(2)}` : 'Grátis'}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          )}
                          
                          {/* Seleções obrigatórias */}
                          {item.requiredSelections && Array.isArray(item.requiredSelections) && item.requiredSelections.length > 0 && (
                            <View style={styles.selectionsContainer}>
                              {item.requiredSelections.map((selection, index) => selection && (
                                <View key={index} style={styles.selectionGroup}>
                                  <Text style={styles.selectionTitle}>{selection.name || 'Seleção'}:</Text>
                                  {Array.isArray(selection.options) && selection.options.map((option, optIndex) => option && (
                                    <Text key={optIndex} style={styles.selectionOption}>• {option}</Text>
                                  ))}
                                </View>
                              ))}
                            </View>
                          )}
                        </View>

                        <View style={styles.itemPriceRow}>
                          <Text style={styles.itemUnitPrice}>
                            R$ {Number(item.price || 0).toFixed(2)} cada
                          </Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyStateText}>Nenhum item encontrado</Text>
                  )}
                </View>

                <View style={styles.summarySection}>
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons name="calculator-outline" size={20} color={colors.purple[600]} />
                    <Text style={styles.modalSectionTitle}>Resumo do Pedido</Text>
                  </View>
                  
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryText}>Subtotal</Text>
                    <Text style={styles.summaryAmount}>
                      R$ {Number(selectedOrder.originalPrice || selectedOrder.totalPrice || 0).toFixed(2)}
                    </Text>
                  </View>
                  
                  {selectedOrder.deliveryFee !== undefined ? (
                    <View style={styles.summaryRow}>
                      <View style={styles.summaryLabel}>
                        <Ionicons name="bicycle-outline" size={16} color={colors.gray[600]} style={styles.summaryIcon} />
                        <Text style={styles.summaryText}>Taxa de Entrega</Text>
                      </View>
                      <Text style={styles.summaryAmount}>
                        {Number(selectedOrder.deliveryFee) > 0 
                          ? `R$ ${Number(selectedOrder.deliveryFee).toFixed(2)}` 
                          : 'Grátis'}
                      </Text>
                    </View>
                  ) : null}

                  {selectedOrder.discountTotal && Number(selectedOrder.discountTotal) > 0 ? (
                    <View style={styles.summaryRow}>
                      <View style={styles.summaryLabel}>
                        <Ionicons name="pricetag-outline" size={16} color={colors.green[600]} style={styles.summaryIcon} />
                        <Text style={[styles.summaryText, {color: colors.green[600]}]}>Desconto</Text>
                      </View>
                      <Text style={[styles.summaryAmount, {color: colors.green[600]}]}>
                        - R$ {Number(selectedOrder.discountTotal).toFixed(2)}
                      </Text>
                    </View>
                  ) : null}

                  {selectedOrder.cardFeeValue && Number(selectedOrder.cardFeeValue) > 0 ? (
                    <View style={styles.summaryRow}>
                      <View style={styles.summaryLabel}>
                        <Ionicons name="card-outline" size={16} color={colors.red[600]} style={styles.summaryIcon} />
                        <Text style={styles.summaryText}>Taxa de Cartão</Text>
                      </View>
                      <Text style={[styles.summaryAmount, { color: colors.red[600] }]}>
                        - R$ {Number(selectedOrder.cardFeeValue).toFixed(2)}
                      </Text>
                    </View>
                  ) : null}

                  <View style={[styles.summaryRow, styles.totalRow]}>
                    <View style={styles.summaryLabel}>
                      <Ionicons name="cash-outline" size={18} color={colors.gray[800]} style={styles.summaryIcon} />
                      <Text style={styles.totalText}>Total</Text>
                    </View>
                    <Text style={styles.totalValue}>
                      R$ {Number(selectedOrder.finalPrice || selectedOrder.total || 0).toFixed(2)}
                    </Text>
                  </View>
                </View>

                <View style={styles.paymentSection}>
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons name="wallet-outline" size={20} color={colors.purple[600]} />
                    <Text style={styles.sectionText}>Forma de Pagamento</Text>
                  </View>
                  
                  <View style={styles.modalPaymentCard}>
                    <View style={styles.paymentCardLeft}>
                      <View style={[
                        styles.paymentIconLarge,
                        { backgroundColor: getPaymentInfo(selectedOrder.paymentMethod || 'cash', selectedOrder.paymentData).bg }
                      ]}>
                        <Ionicons 
                          name={getPaymentInfo(selectedOrder.paymentMethod || 'cash', selectedOrder.paymentData).icon as any}
                          size={28}
                          color={getPaymentInfo(selectedOrder.paymentMethod || 'cash', selectedOrder.paymentData).color}
                        />
                      </View>
                      
                      <View style={styles.paymentDetails}>
                        <Text style={styles.paymentMethodName}>
                          {getPaymentInfo(selectedOrder.paymentMethod || 'cash', selectedOrder.paymentData).name}
                        </Text>
                        <Text style={styles.paymentStatus}>
                          {selectedOrder.status === 'delivered' ? 'Pagamento confirmado' : 'Aguardando confirmação'}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.paymentAmountContainer}>
                      <Text style={styles.paymentAmountLabel}>Valor pago</Text>
                      <Text style={styles.paymentAmount}>
                        R$ {Number(selectedOrder.total || 0).toFixed(2)}
                      </Text>
                    </View>
                  </View>
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
    backgroundColor: colors.gray[100],
    justifyContent: 'flex-end',
  },
  modalContent: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.gray[800],
  },
  modalScroll: {
    maxHeight: '100%',
  },
  orderInfoCard: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  orderInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderInfoText: {
    fontSize: 14,
    color: colors.gray[700],
    marginLeft: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[800],
    marginTop: 8,
  },
  itemDetails: {
    flex: 1,
    marginRight: 8,
  },
  itemUnitPrice: {
    fontSize: 12,
    color: colors.gray[600],
    marginTop: 2,
  },
  summarySection: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  summaryLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIcon: {
    marginRight: 8,
  },
  summaryText: {
    fontSize: 14,
    color: colors.gray[700],
  },
  summaryAmount: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray[800],
  },
  totalRow: {
    borderBottomWidth: 0,
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[800],
  },
  paymentSection: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalPaymentCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray[200],
    marginTop: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  paymentCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentIconLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  paymentDetails: {
    justifyContent: 'center',
  },
  paymentMethodName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[800],
    marginBottom: 6,
  },
  paymentStatus: {
    fontSize: 13,
    color: colors.green[600],
    fontWeight: '500',
  },
  paymentAmountContainer: {
    alignItems: 'flex-end',
    backgroundColor: colors.gray[50],
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  paymentAmountLabel: {
    fontSize: 12,
    color: colors.gray[600],
    marginBottom: 4,
    fontWeight: '500',
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[800],
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
  backButton: {
    padding: 8,
  },
  shareButton: {
    padding: 8,
  },
  customerSection: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: 8,
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
  customerSource: {
    fontSize: 12,
    color: colors.gray[500],
    marginBottom: 8,
    fontStyle: 'italic'
  },
  fullAddressContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray[700],
    marginBottom: 4,
  },
  detailedItemCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemQuantityBadge: {
    backgroundColor: colors.purple[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  itemQuantityText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.purple[700],
  },
  itemTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[800],
  },
  itemPriceText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray[800],
  },
  itemDetailsContainer: {
    paddingVertical: 8,
  },
  optionsContainer: {
    marginBottom: 8,
  },
  optionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: 4,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  optionName: {
    fontSize: 14,
    color: colors.gray[700],
  },
  optionPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray[700],
  },
  selectionsContainer: {
    marginTop: 8,
  },
  selectionGroup: {
    marginBottom: 8,
  },
  selectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: 4,
  },
  selectionOption: {
    fontSize: 14,
    color: colors.gray[700],
    paddingVertical: 2,
  },
  itemPriceRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  totalText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[800],
  },
  orderStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  orderStatusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
}); 