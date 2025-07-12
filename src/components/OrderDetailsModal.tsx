import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Modal, 
  Share 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/styles/theme/colors';
import { Order } from '@/services/firebaseSales';

interface OrderDetailsModalProps {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
}

// Função para formatar a hora de um timestamp
const formatTime = (order: Order): string => {
  try {
    if (!order || !order.createdAt) return 'Sem data';
    
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

CLIENTE
Nome: ${order.userName || order.customerName || 'Não informado'}
${order.customerPhone ? `Telefone: ${order.customerPhone}` : ''}

ITENS DO PEDIDO
${Array.isArray(order.items) ? order.items.map(item => 
  `${item.quantity}x ${item.name} - R$ ${(Number(item.price) * Number(item.quantity)).toFixed(2)}`
).join('\n') : 'Nenhum item'}

TOTAL: R$ ${Number(order.finalPrice || order.total || 0).toFixed(2)}
`;

    await Share.share({
      message: receiptText,
      title: 'Recibo do Pedido',
    });
  } catch (error) {
    console.error('Erro ao compartilhar recibo:', error);
  }
};

// Componente para as informações básicas do pedido
const OrderBasicInfo = ({ order }: { order: Order }) => (
  <View style={styles.infoCard}>
    <View style={styles.orderHeader}>
      <View style={styles.orderNumberContainer}>
        <Text style={styles.orderNumber}>#{order.id?.slice(-6) || 'N/A'}</Text>
      </View>
      <View style={styles.orderStatus}>
        <View style={[
          styles.statusDot,
          { backgroundColor: order.status === 'delivered' ? colors.green[500] : colors.orange }
        ]} />
        <Text style={styles.statusText}>
          {order.status === 'delivered' ? 'Concluído' : 'Pendente'}
        </Text>
      </View>
    </View>
    
    <View style={styles.orderTimeRow}>
      <Text style={styles.orderTime}>Realizado às {formatTime(order)}</Text>
    </View>
    
    <View style={styles.orderMeta}>
      <Text style={styles.orderType}>
        Tipo de venda: {order.deliveryMode === 'delivery' || order.deliveryFee > 0 ? 'Entrega' : 'Retirada'}
      </Text>
    </View>
  </View>
);

// Componente para informações do cliente
const CustomerInfo = ({ order }: { order: Order }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Cliente</Text>
    <View style={styles.customerCard}>
      <Text style={styles.customerName}>
        {order.userName || order.customerName || 'Cliente não identificado'}
      </Text>
      {order.customerPhone && (
        <Text style={styles.customerPhone}>{order.customerPhone}</Text>
      )}
      {order.customerAddress && (
        <Text style={styles.customerAddress}>
          {String(order.customerAddress)}
        </Text>
      )}
    </View>
  </View>
);

// Componente para os itens do pedido
const OrderItems = ({ order }: { order: Order }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Itens</Text>
    <View style={styles.itemsCard}>
      {Array.isArray(order.items) && order.items.length > 0 ? (
        order.items.map((item, index) => (
          <View key={index} style={styles.itemRow}>
            <View style={styles.itemQuantity}>
              <Text style={styles.quantityText}>{Number(item.quantity || 0)}x</Text>
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{String(item.name || 'Item')}</Text>
              {item.options && Array.isArray(item.options) && item.options.length > 0 && (
                <View style={styles.itemExtras}>
                  {item.options.map((option, optIndex) => option && (
                    <Text key={optIndex} style={styles.extraText}>
                      • {option.name || 'Extra'}
                    </Text>
                  ))}
                </View>
              )}
            </View>
            <Text style={styles.itemPrice}>
              R$ {Number((Number(item.price) || 0) * (Number(item.quantity) || 0)).toFixed(2)}
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>Nenhum item encontrado</Text>
      )}
    </View>
  </View>
);

// Componente para o resumo do pedido
const OrderSummary = ({ order }: { order: Order }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Resumo</Text>
    <View style={styles.summaryCard}>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Subtotal</Text>
        <Text style={styles.summaryValue}>
          R$ {Number((order.total || 0) - (order.deliveryFee || 0)).toFixed(2)}
        </Text>
      </View>
      
      {order.deliveryFee !== undefined && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Taxa de entrega</Text>
          <Text style={styles.summaryValue}>
            {Number(order.deliveryFee) > 0 
              ? `R$ ${Number(order.deliveryFee).toFixed(2)}` 
              : 'Grátis'}
          </Text>
        </View>
      )}

      {order.discountTotal && Number(order.discountTotal) > 0 && (
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.green[600] }]}>Desconto</Text>
          <Text style={[styles.summaryValue, { color: colors.green[600] }]}>
            - R$ {Number(order.discountTotal).toFixed(2)}
          </Text>
        </View>
      )}

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>
          R$ {Number(order.finalPrice || order.total || 0).toFixed(2)}
        </Text>
      </View>

      {/* Informações de Pagamento */}
      {order.paymentMethod && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Forma de Pagamento</Text>
          <Text style={styles.summaryValue}>
            {order.paymentMethod === 'cash' ? 'DINHEIRO' : order.paymentMethod.toUpperCase()}
            {order.paymentData?.flagName && ` - ${order.paymentData.flagName}`}
            {order.paymentMethod === 'cash' && order.paymentData?.changeFor && (
              order.paymentData.changeFor === 'sem_troco' 
                ? ' - Sem troco'
                : ` - Troco para R$ ${Number(order.paymentData.changeFor).toFixed(2)}`
            )}
          </Text>
        </View>
      )}
    </View>
  </View>
);

export default function OrderDetailsModal({ visible, order, onClose }: OrderDetailsModalProps) {
  if (!order) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.gray[600]} />
          </TouchableOpacity>
          <Text style={styles.title}>Detalhes do Pedido</Text>
          <TouchableOpacity 
            onPress={() => handleShareReceipt(order)}
            style={styles.shareButton}
          >
            <Ionicons name="share-outline" size={24} color={colors.orange} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <OrderBasicInfo order={order} />
          <CustomerInfo order={order} />
          <OrderItems order={order} />
          <OrderSummary order={order} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[800],
  },
  shareButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 16,
    marginTop: 20,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderNumberContainer: {
    backgroundColor: colors.orange,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  orderStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: colors.gray[600],
  },
  orderTimeRow: {
    marginTop: 12,
    marginBottom: 8,
  },
  orderMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orderTime: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.orange,
  },
  orderType: {
    fontSize: 14,
    color: colors.gray[600],
  },
  customerCard: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.orange,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: colors.gray[600],
    marginBottom: 4,
  },
  customerAddress: {
    fontSize: 14,
    color: colors.gray[600],
    lineHeight: 20,
  },
  itemsCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  itemQuantity: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 12,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[700],
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[800],
    marginBottom: 4,
  },
  itemExtras: {
    marginTop: 4,
  },
  extraText: {
    fontSize: 12,
    color: colors.gray[600],
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[800],
  },
  emptyText: {
    fontSize: 14,
    color: colors.gray[600],
    textAlign: 'center',
    padding: 20,
  },
  summaryCard: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.gray[600],
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray[800],
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[800],
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.orange,
  },
}); 