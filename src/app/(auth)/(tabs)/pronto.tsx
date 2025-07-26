import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, Alert, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePedidos } from '../../../contexts/PedidosContext';
import { EmptyState } from '../../../components/EmptyState';
import { Pedido } from '../../../contexts/PedidosContext';
import { notificationService } from '../../../services/notificationService';
import { colors } from '../../../styles/theme/colors';

export default function Pronto() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { pedidosProntos, marcarComoEmEntrega } = usePedidos();
  const [isProcessing, setIsProcessing] = useState(false);

  if (pedidosProntos.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <EmptyState
          icon="checkmark-circle-outline"
          title="Nenhum pedido pronto"
          message="Os pedidos prontos para entrega aparecerão aqui."
        />
      </SafeAreaView>
    );
  }

  const handleEmEntrega = async (pedidoId: string, userId: string) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      await marcarComoEmEntrega(pedidoId);
      
      // Enviar notificação de pedido em entrega (como cupom)
      await notificationService.sendOrderStatusNotificationToUser(
        userId,
        pedidoId,
        'out_for_delivery'
      );
      
      Alert.alert(
        'Pedido Enviado',
        'Pedido marcado como em entrega com sucesso!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Erro ao enviar pedido para entrega:', error);
      Alert.alert(
        'Erro',
        'Não foi possível enviar o pedido para entrega. Tente novamente.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const formatarDataHora = (timestamp: any) => {
    try {
      if (timestamp?.seconds) {
        const data = new Date(timestamp.seconds * 1000);
        return data.toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Sao_Paulo',
          hour12: false
        });
      } else if (timestamp instanceof Date) {
        return timestamp.toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Sao_Paulo',
          hour12: false
        });
      } else if (typeof timestamp === 'string') {
        return new Date(timestamp).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Sao_Paulo',
          hour12: false
        });
      }
      return 'Data não disponível';
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return 'Data não disponível';
    }
  };

  const renderPedido = ({ item }: { item: Pedido }) => {
    const isExpanded = expandedId === item.id;
    const isPickup = item.deliveryMode === 'pickup';

    // Calcula o valor do troco se necessário
    const calcularTroco = () => {
      if (item.payment?.method === 'money' && item.payment?.changeFor) {
        // Verifica se é "sem troco"
        if (item.payment?.changeFor === 'sem_troco') {
          return 'sem_troco';
        }
        const valorPagamento = parseFloat(item.payment?.changeFor || '0');
        const trocoValue = valorPagamento - item.finalPrice;
        return trocoValue > 0 ? trocoValue.toFixed(2) : '0.00';
      }
      return null;
    };

    const troco = calcularTroco();

    return (
      <View style={styles.card}>
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
            <Ionicons name="person-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              {item.userName || 'Cliente não identificado'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              Pronto às {formatarDataHora(item.createdAt)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              Total: R$ {(item.finalPrice || 0).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Lista de Itens */}
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Itens do Pedido</Text>
          {item.items.map((itemPedido, index) => {
            // Calcular preço total do item incluindo opcionais
            let precoItemComOpcionais = itemPedido.price * itemPedido.quantity;
            if (itemPedido.options && itemPedido.options.length > 0) {
              itemPedido.options.forEach(option => {
                precoItemComOpcionais += (option.price || 0);
              });
            }
            
            return (
              <View key={index} style={styles.itemContainer}>
                <View style={styles.itemRow}>
                  <Text style={styles.itemQuantity}>{itemPedido.quantity}x</Text>
                  <Text style={styles.itemName}>{itemPedido.name}</Text>
                  <Text style={styles.itemPrice}>
                    R$ {(itemPedido.price * itemPedido.quantity).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemUnitPrice}>
                    R$ {itemPedido.price.toFixed(2)} cada
                  </Text>
                </View>
                {itemPedido.options && itemPedido.options.length > 0 && (
                  <View style={styles.optionsContainer}>
                    {itemPedido.options.map((option, optionIndex) => (
                      <View key={`option-${optionIndex}`} style={styles.optionRow}>
                        <Text style={styles.optionQuantity}>1x</Text>
                        <Text style={styles.optionName}>{option.name}</Text>
                        <Text style={styles.optionPrice}>
                          R$ {(option.price || 0).toFixed(2)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                
                {/* Total do item com opcionais */}
                {itemPedido.options && itemPedido.options.length > 0 && (
                  <View style={styles.itemTotalRow}>
                    <Text style={styles.itemTotalLabel}>Total do item:</Text>
                    <Text style={styles.itemTotalValue}>
                      R$ {precoItemComOpcionais.toFixed(2)}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Detalhes Expandidos */}
        {isExpanded && (
          <View style={styles.details}>
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>Informações de Pagamento</Text>
              <View style={styles.infoContainer}>
                <View style={styles.infoRow}>
                  <Ionicons 
                    name={item.payment?.method === 'money' ? "cash-outline" : "card-outline"} 
                    size={16} 
                    color="#666" 
                  />
                  <Text style={styles.infoText}>
                    {item.payment?.method === 'money' ? 'DINHEIRO' : item.payment?.method?.toUpperCase() || 'NÃO INFORMADO'}
                    {item.payment?.cardFee?.flagName && ` - ${item.payment?.cardFee?.flagName}`}
                  </Text>
                </View>
                {item.payment?.method === 'money' && item.payment?.changeFor && (
                  <>
                    {item.payment?.changeFor === 'sem_troco' ? (
                      <View style={styles.infoRow}>
                        <Ionicons name="close-circle-outline" size={16} color="#666" />
                        <Text style={styles.infoText}>Pagamento: Sem troco</Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.infoRow}>
                          <Ionicons name="wallet-outline" size={16} color="#666" />
                          <Text style={styles.infoText}>Pago com: R$ {item.payment?.changeFor}</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Ionicons name="return-down-back-outline" size={16} color="#666" />
                          <Text style={[styles.infoText, styles.trocoText]}>Troco: R$ {troco}</Text>
                        </View>
                      </>
                    )}
                  </>
                )}
              </View>
            </View>

            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>Tipo de Pedido</Text>
              <View style={styles.infoContainer}>
                <View style={styles.infoRow}>
                  <Ionicons 
                    name={item.deliveryMode === 'pickup' ? "storefront-outline" : "bicycle-outline"} 
                    size={16} 
                    color="#666" 
                  />
                  <Text style={styles.infoText}>
                    {item.deliveryMode === 'pickup' ? 'Retirada no local' : 'Entrega'}
                  </Text>
                </View>
                {item.customerPhone && (
                  <View style={styles.infoRow}>
                    <Ionicons name="call-outline" size={16} color="#666" />
                    <Text style={styles.infoText}>Telefone: {item.customerPhone}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Endereço - só se for entrega */}
            {item.deliveryMode === 'delivery' && (
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Endereço de Entrega</Text>
                <View style={styles.addressContainer}>
                  <Text style={styles.addressText}>
                    <Text style={styles.addressLabel}>Rua:</Text> {item.address.street}, {item.address.number}
                  </Text>
                  {item.address.complement && (
                    <Text style={styles.addressText}>
                      <Text style={styles.addressLabel}>Complemento:</Text> {item.address.complement}
                    </Text>
                  )}
                  <Text style={styles.addressText}>
                    <Text style={styles.addressLabel}>Bairro:</Text> {item.address.neighborhood}
                  </Text>
                </View>
              </View>
            )}

            {/* Observações */}
            {item.observations && (
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Observações</Text>
                <View style={styles.infoContainer}>
                  <View style={styles.infoRow}>
                    <Ionicons name="chatbubble-outline" size={16} color="#666" />
                    <Text style={styles.infoText}>{item.observations}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Botão de Ação */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.deliveryButton, isPickup && styles.pickupButton, isProcessing && styles.disabledButton]}
            onPress={() => handleEmEntrega(item.id, item.userId)}
            disabled={isProcessing}
          >
            <Ionicons name={isPickup ? "hand-left" : "bicycle"} size={20} color="#fff" />
            <Text style={styles.deliveryButtonText}>
              {isPickup ? 'Disponível para Retirada' : 'Enviar para Entrega'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <FlatList
          data={pedidosProntos}
          renderItem={renderPedido}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          style={{flex: 1, width: '100%'}}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
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
    fontSize: 14,
    color: '#666',
  },
  content: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  itemContainer: {
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    width: 40,
    textAlign: 'left',
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  itemPrice: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    minWidth: 80,
    textAlign: 'right',
  },
  details: {
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  detailsSection: {
    marginBottom: 16,
  },
  infoContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    gap: 8,
  },
  addressContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  addressText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 2,
  },
  addressLabel: {
    fontWeight: '600',
    color: '#333',
  },
  trocoText: {
    fontWeight: 'bold',
    color: '#FF5722',
  },
  footer: {
    padding: 16,
  },
  deliveryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  pickupButton: {
    backgroundColor: '#8E44AD',
  },
  deliveryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.7,
    backgroundColor: '#aaa',
  },
  itemDetails: {
    marginLeft: 40,
    marginTop: 4,
  },
  itemUnitPrice: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  optionsContainer: {
    marginLeft: 20,
    marginTop: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  optionQuantity: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666',
    width: 40,
    textAlign: 'left',
  },
  optionName: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  optionPrice: {
    fontSize: 14,
    color: '#666',
    minWidth: 80,
    textAlign: 'right',
  },
  itemTotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  itemTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  itemTotalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    minWidth: 80,
    textAlign: 'right',
  },
}); 