import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePedidos } from '../../../contexts/PedidosContext';
import { EmptyState } from '../../../components/EmptyState';
import { Pedido } from '../../../contexts/PedidosContext';
import { notificationService } from '../../../services/notificationService';

export default function EmEntrega() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { pedidosEmEntrega, marcarComoEntregue } = usePedidos();
  const [isProcessing, setIsProcessing] = useState(false);

  if (pedidosEmEntrega.length === 0) {
    return (
      <EmptyState
        icon="bicycle-outline"
        title="Nenhum pedido em andamento"
        message="Os pedidos em entrega ou disponíveis para retirada aparecerão aqui."
      />
    );
  }

  const handleEntregaConfirmada = async (pedidoId: string, userId: string) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      await marcarComoEntregue(pedidoId);
      
      // Enviar notificação de pedido entregue
      await notificationService.sendOrderNotification(
        userId,
        notificationService.getOrderStatusMessage('completed', pedidoId, userId)
      );
      
      // Exibir alerta após a entrega ser confirmada
      Alert.alert(
        'Pedido Concluído',
        'Pedido marcado como entregue com sucesso!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Erro ao confirmar entrega:', error);
      Alert.alert(
        'Erro',
        'Não foi possível confirmar a entrega. Tente novamente.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const renderPedido = ({ item }: { item: Pedido }) => {
    const isExpanded = expandedId === item.id;
    const isPickup = item.deliveryMode === 'pickup';

    // Formata o endereço completo
    const endereco = `${item.address.street}, ${item.address.number}${item.address.complement ? ` - ${item.address.complement}` : ''}\n${item.address.neighborhood}, ${item.address.city} - ${item.address.state}`;

    // Formata a data de criação corretamente
    const formatarDataHora = (timestamp: any) => {
      try {
        if (timestamp?.seconds) {
          // Se for um timestamp do Firestore, converter para Date
          const data = new Date(timestamp.seconds * 1000);
          return data.toLocaleTimeString('pt-BR');
        } else if (timestamp instanceof Date) {
          return timestamp.toLocaleTimeString('pt-BR');
        } else if (typeof timestamp === 'string') {
          return new Date(timestamp).toLocaleTimeString('pt-BR');
        }
        return 'Data não disponível';
      } catch (error) {
        console.error('Erro ao formatar data:', error);
        return 'Data não disponível';
      }
    };

    return (
      <View style={styles.pedidoCard}>
        <TouchableOpacity 
          style={styles.pedidoHeader}
          onPress={() => setExpandedId(isExpanded ? null : item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.headerLeft}>
            <Text style={styles.orderTime}>
              Pedido feito às {formatarDataHora(item.createdAt)}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Ionicons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#666"
              style={styles.expandIcon}
            />
          </View>
        </TouchableOpacity>

        <View style={styles.itemsList}>
          {item.items.map((itemPedido, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.quantityText}>{itemPedido.quantity}×</Text>
              <Text style={styles.itemText}>
                {itemPedido.name}
              </Text>
            </View>
          ))}
        </View>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Cliente:</Text>
              <Text style={styles.infoText}>{item.userName}</Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Tipo de Pedido:</Text>
              <Text style={styles.infoText}>{isPickup ? 'Retirada no local' : 'Entrega'}</Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Pagamento:</Text>
              <Text style={styles.infoText}>
                {item.payment.method === 'money' ? 'DINHEIRO' : item.payment.method.toUpperCase()}
                {item.payment.cardFee?.flagName && ` - ${item.payment.cardFee.flagName}`}
                {item.payment.method === 'money' && item.payment.changeFor && (
                  item.payment.changeFor === 'sem_troco' 
                    ? ' - Sem troco'
                    : ` - Troco para R$ ${Number(item.payment.changeFor).toFixed(2)}`
                )}
              </Text>
            </View>
            
            {!isPickup && (
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Endereço de Entrega:</Text>
                <Text style={styles.infoText}>{endereco}</Text>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity 
          style={[styles.deliveredButton, isPickup && styles.pickupButton, isProcessing && styles.disabledButton]}
          onPress={() => handleEntregaConfirmada(item.id, item.userId)}
          disabled={isProcessing}
        >
          <Ionicons name="checkmark-done" size={22} color="#fff" />
          <Text style={styles.deliveredButtonText}>
            {isPickup ? 'Confirmar Retirada' : 'Confirmar Entrega'}
          </Text>
        </TouchableOpacity>


      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={pedidosEmEntrega}
        renderItem={renderPedido}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    padding: 16,
  },
  pedidoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  pedidoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderTime: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  paymentMethod: {
    display: 'none',
  },
  expandIcon: {
    marginLeft: 8,
  },
  itemsList: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  quantityText: {
    fontSize: 16,
    color: '#666',
    marginRight: 12,
    fontWeight: '500',
  },
  itemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 16,
    marginBottom: 12,
  },
  infoSection: {
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },

  deliveredButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  pickupButton: {
    backgroundColor: '#8E44AD',
  },
  deliveredButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.7,
    backgroundColor: '#aaa',
  },
}); 