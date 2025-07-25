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
      
      // Enviar notificação de pedido entregue (como cupom)
      await notificationService.sendOrderStatusNotificationToUser(
        userId,
        pedidoId,
        'delivered'
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
        {/* Cabeçalho com ID do Pedido */}
        <View style={styles.orderIdHeader}>
          <Text style={styles.orderId}>Pedido #{item.id.slice(0, 8)}</Text>
          <TouchableOpacity onPress={() => setExpandedId(isExpanded ? null : item.id)}>
            <Ionicons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={24} 
              color="#666"
            />
          </TouchableOpacity>
        </View>

        {/* Informações Básicas */}
        <View style={styles.basicInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              Feito às {formatarDataHora(item.createdAt)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="list-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              {item.items.length} {item.items.length === 1 ? 'item' : 'itens'} no pedido
            </Text>
          </View>
        </View>

        {/* Lista de Itens - Só mostra quando expandido */}
        {isExpanded && (
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Itens do Pedido</Text>
            {item.items.map((itemPedido, index) => (
              <View key={index} style={styles.itemRow}>
                <Text style={styles.quantityText}>{itemPedido.quantity}×</Text>
                <Text style={styles.itemText}>
                  {itemPedido.name}
                </Text>
              </View>
            ))}
          </View>
        )}

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

        {/* Botão de Ação */}
        <View style={styles.footer}>
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
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  orderIdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f8f8f8',
  },
  orderId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  basicInfo: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
    lineHeight: 18,
  },
  paymentMethod: {
    display: 'none',
  },
  expandIcon: {
    marginLeft: 8,
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  infoSection: {
    marginBottom: 12,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  itemsList: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    width: 40,
    textAlign: 'left',
  },
  itemText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  content: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  footer: {
    padding: 16,
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