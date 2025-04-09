import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePedidos } from '../../../contexts/PedidosContext';
import { EmptyState } from '../../../components/EmptyState';
import { Pedido } from '../../../contexts/PedidosContext';

export default function Pronto() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { pedidosProntos, marcarComoEmEntrega } = usePedidos();
  const [isProcessing, setIsProcessing] = useState(false);

  if (pedidosProntos.length === 0) {
    return (
      <EmptyState
        icon="checkmark-circle-outline"
        title="Nenhum pedido pronto"
        message="Os pedidos prontos para entrega aparecerão aqui."
      />
    );
  }

  const handleEmEntrega = async (pedidoId: string) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      await marcarComoEmEntrega(pedidoId);
      
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

  const renderPedido = ({ item }: { item: Pedido }) => {
    const isExpanded = expandedId === item.id;
    const isPickup = item.deliveryMode === 'pickup';

    // Formata o endereço completo
    const endereco = {
      rua: item.address.street,
      numero: item.address.number,
      complemento: item.address.complement,
      bairro: item.address.neighborhood,
      cidade: item.address.city,
      estado: item.address.state
    };

    // Calcula o valor do troco se necessário
    const calcularTroco = () => {
      if (item.payment.method === 'money' && item.payment.changeFor) {
        const valorPagamento = parseFloat(item.payment.changeFor);
        const trocoValue = valorPagamento - item.finalPrice;
        return trocoValue > 0 ? trocoValue.toFixed(2) : '0.00';
      }
      return null;
    };

    const troco = calcularTroco();

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
            <View style={styles.statusBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.statusText}>Pronto para Entrega</Text>
            </View>
            <Text style={styles.customerName}>
              Cliente: {item.userName || 'Não informado'}
            </Text>
            <Text style={styles.orderTime}>
              Pedido feito às {formatarDataHora(item.createdAt)}
            </Text>
            <Text style={styles.paymentMethod}>
              Pagamento: {item.payment.method.toUpperCase()} • R$ {item.totalPrice.toFixed(2)}
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
              <Ionicons name="radio-button-off" size={18} color="#666" />
              <Text style={styles.itemText}>
                {itemPedido.quantity}x {itemPedido.name}
              </Text>
            </View>
          ))}
        </View>

        {isExpanded && (
          <View style={styles.expandedContent}>
            {/* Informações do Cliente */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Informações do Cliente:</Text>
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={16} color="#666" />
                <Text style={styles.infoText}>Nome: {item.userName || 'Não informado'}</Text>
              </View>
              {item.customerPhone && (
                <View style={styles.infoRow}>
                  <Ionicons name="call-outline" size={16} color="#666" />
                  <Text style={styles.infoText}>Telefone: {item.customerPhone}</Text>
                </View>
              )}
            </View>

            {/* Modo de entrega */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Tipo de Pedido:</Text>
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
            </View>

            {/* Informações de Pagamento */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Pagamento:</Text>
              <View style={styles.infoRow}>
                <Ionicons 
                  name={item.payment.method === 'money' ? "cash-outline" : "card-outline"} 
                  size={16} 
                  color="#666" 
                />
                <Text style={styles.infoText}>
                  Método: {item.payment.method === 'money' ? 'DINHEIRO' : item.payment.method.toUpperCase()}
                  {item.payment.cardFee?.flagName && ` - ${item.payment.cardFee.flagName}`}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="pricetag-outline" size={16} color="#666" />
                <Text style={styles.infoText}>Valor Total: R$ {item.finalPrice.toFixed(2)}</Text>
              </View>
              {item.payment.method === 'money' && item.payment.changeFor && (
                <>
                  <View style={styles.infoRow}>
                    <Ionicons name="wallet-outline" size={16} color="#666" />
                    <Text style={styles.infoText}>Pago com: R$ {item.payment.changeFor}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="return-down-back-outline" size={16} color="#666" />
                    <Text style={[styles.infoText, styles.trocoText]}>Troco: R$ {troco}</Text>
                  </View>
                </>
              )}
            </View>
            
            {/* Só mostra endereço se for entrega */}
            {item.deliveryMode === 'delivery' && (
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Endereço de Entrega:</Text>
                <View style={styles.addressContainer}>
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={16} color="#666" />
                    <Text style={styles.infoText}>
                      <Text style={styles.addressLabel}>Rua:</Text> {endereco.rua}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={16} color="#666" />
                    <Text style={styles.infoText}>
                      <Text style={styles.addressLabel}>Número:</Text> {endereco.numero}
                      {endereco.complemento ? ` - ${endereco.complemento}` : ''}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={16} color="#666" />
                    <Text style={styles.infoText}>
                      <Text style={styles.addressLabel}>Bairro:</Text> {endereco.bairro}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Observações do pedido */}
            {item.observations && (
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Observações:</Text>
                <View style={styles.infoRow}>
                  <Ionicons name="chatbubble-outline" size={16} color="#666" />
                  <Text style={styles.infoText}>{item.observations}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Botões de ação */}
        <TouchableOpacity 
          style={[styles.deliveryButton, isPickup && styles.pickupButton, isProcessing && styles.disabledButton]}
          onPress={() => handleEmEntrega(item.id)}
          disabled={isProcessing}
        >
          <Ionicons name={isPickup ? "hand-left" : "bicycle"} size={22} color="#fff" />
          <Text style={styles.deliveryButtonText}>
            {isPickup ? 'Disponível para Retirada' : 'Enviar para Entrega'}
          </Text>
        </TouchableOpacity>

        {/* Status Badge */}
        <View style={[styles.statusBadge, isPickup && styles.statusBadgePickup]}>
          <Ionicons 
            name={isPickup ? "storefront" : "checkmark-circle"}
            size={16} 
            color={isPickup ? "#8E44AD" : "#4CAF50"}
          />
          <Text style={[styles.statusText, isPickup && styles.statusTextPickup]}>
            {isPickup ? 'Pronto para Retirada' : 'Pronto para Entrega'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={pedidosProntos}
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
    fontSize: 14,
    color: '#666',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  paymentMethod: {
    fontSize: 14,
    color: '#666',
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
    gap: 8,
  },
  itemText: {
    fontSize: 14,
    color: '#444',
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
    gap: 4,
  },
  statusBadgePickup: {
    backgroundColor: '#F5EEF8',
  },
  statusText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  statusTextPickup: {
    color: '#8E44AD',
  },
  deliveryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  pickupButton: {
    backgroundColor: '#8E44AD',
  },
  deliveryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.7,
    backgroundColor: '#aaa',
  },
  addressContainer: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  addressLabel: {
    fontWeight: '600',
    color: '#333',
  },
  trocoText: {
    fontWeight: 'bold',
    color: '#FF5722',
  },
}); 