import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePedidos } from '@/contexts/PedidosContext';
import { Pedido, OrderItem } from '@/contexts/PedidosContext';
import { EmptyState } from '@/components/EmptyState';
import { notificationService } from '@/services/notificationService';

export default function Preparando() {
  const { pedidosCozinha, marcarComoPronto, cancelarPedido } = usePedidos();
  const [isProcessing, setIsProcessing] = useState(false);

  if (pedidosCozinha.length === 0) {
    return (
      <EmptyState
        icon="hourglass-outline"
        title="Nenhum pedido em preparo"
        message="Os pedidos aceitos aparecerão aqui para serem preparados."
      />
    );
  }

  const handleCancelarPedido = async (pedidoId: string) => {
    if (isProcessing) return;
    
    Alert.alert(
      'Cancelar Pedido',
      'Tem certeza que deseja cancelar este pedido? Esta ação não pode ser desfeita.',
      [
        {
          text: 'Não',
          style: 'cancel'
        },
        {
          text: 'Sim, Cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsProcessing(true);
              await cancelarPedido(pedidoId);
              
              Alert.alert(
                'Pedido Cancelado',
                'O pedido foi cancelado com sucesso.',
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Erro ao cancelar pedido:', error);
              Alert.alert(
                'Erro',
                'Não foi possível cancelar o pedido. Tente novamente.'
              );
            } finally {
              setIsProcessing(false);
            }
          }
        }
      ]
    );
  };

  const handleMarcarComoPronto = async (pedidoId: string, userId: string) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      await marcarComoPronto(pedidoId);
      
      // Enviar notificação de pedido pronto (como cupom)
      await notificationService.sendOrderStatusNotificationToUser(
        userId,
        pedidoId,
        'ready'
      );
      
      Alert.alert(
        'Pedido Pronto',
        'Pedido marcado como pronto com sucesso!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Erro ao marcar pedido como pronto:', error);
      Alert.alert(
        'Erro',
        'Não foi possível marcar o pedido como pronto. Tente novamente.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const renderPedido = ({ item }: { item: Pedido }) => {
    // Converter o timestamp do Firestore para uma data JavaScript
    const createdAtDate = new Date(
      item.createdAt.seconds * 1000 + item.createdAt.nanoseconds / 1000000
    );

    return (
      <View style={styles.pedidoCard}>
        <View style={styles.pedidoHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.orderTime}>
              Pedido #{item.id.slice(0, 8)} • {createdAtDate.toLocaleTimeString('pt-BR')}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.deliveryIndicator}>
              <Ionicons 
                name={item.deliveryMode === 'pickup' ? "storefront" : "restaurant"} 
                size={18} 
                color={item.deliveryMode === 'pickup' ? "#8e44ad" : "#e67e22"}
              />
            </View>
          </View>
        </View>

        {/* Detalhes sempre visíveis */}
        <View style={styles.expandedContent}>
          {item.items.map((itemPedido: OrderItem, index: number) => (
            <View key={index} style={styles.expandedItemContainer}>
              <View style={styles.itemRow}>
                <Text style={styles.itemQuantity}>{itemPedido.quantity}x</Text>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>
                    {itemPedido.name}
                  </Text>
                </View>
              </View>
              
              {/* Seleções Obrigatórias */}
              {itemPedido.requiredSelections && itemPedido.requiredSelections.length > 0 && (
                <View style={styles.selectionsContainer}>
                  {itemPedido.requiredSelections.map((selection, selIndex: number) => (
                    <View key={selIndex} style={styles.selectionGroup}>
                      <Text style={styles.selectionName}>{selection.name}:</Text>
                      <View style={styles.selectionOptions}>
                        {selection.options.map((option: string, optIndex: number) => (
                          <Text key={optIndex} style={styles.selectionOption}>
                            {option}
                          </Text>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Adicionais */}
              {itemPedido.options && itemPedido.options.length > 0 && (
                <View style={styles.additionalsContainer}>
                  <Text style={styles.additionalsTitle}>Adicionais:</Text>
                  {itemPedido.options.map((option, optIndex: number) => (
                    <Text key={optIndex} style={styles.additionalText}>
                      • {(option as any).quantity ? `${(option as any).quantity}x` : ""} <Text style={styles.additionalHighlight}>{option.name}</Text>
                    </Text>
                  ))}
                </View>
              )}

              {/* Observações */}
              {item.observations && (
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>Observações:</Text>
                  <Text style={styles.infoText}>{item.observations}</Text>
                </View>
              )}

              {/* Linha divisória entre itens */}
              {index < item.items.length - 1 && <View style={styles.itemDivider} />}
            </View>
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.cancelButton, isProcessing && styles.disabledButton]}
            onPress={() => handleCancelarPedido(item.id)}
            disabled={isProcessing}
          >
            <Ionicons name="close-circle" size={22} color="#fff" />
            <Text style={styles.buttonText}>Cancelar Pedido</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.readyButton, isProcessing && styles.disabledButton]}
            onPress={() => handleMarcarComoPronto(item.id, item.userId)}
            disabled={isProcessing}
          >
            <Ionicons name="checkmark-circle" size={22} color="#fff" />
            <Text style={styles.buttonText}>Marcar como Pronto</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={pedidosCozinha}
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
    backgroundColor: '#f8f9fa',
  },
  listContainer: {
    padding: 12,
  },
  pedidoCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  pedidoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
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
    fontWeight: '600',
    color: '#333',
  },
  expandedContent: {
    paddingTop: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  itemDetails: {
    flex: 1,
  },
  itemQuantity: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    minWidth: 30,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  expandedItemContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 10,
    marginBottom: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#4CAF50',
  },
  selectionsContainer: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 6,
    borderWidth: 1,
    borderColor: '#f1f3f4',
  },
  selectionGroup: {
    marginBottom: 6,
  },
  selectionName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  selectionOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  selectionOption: {
    fontSize: 13,
    color: '#555',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  additionalsContainer: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 6,
    borderWidth: 1,
    borderColor: '#f1f3f4',
  },
  additionalsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  additionalText: {
    fontSize: 13,
    color: '#555',
    marginBottom: 1,
  },
  additionalHighlight: {
    fontWeight: '600',
    color: '#222',
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#f1f3f4',
    marginVertical: 8,
  },
  infoSection: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 6,
    borderWidth: 1,
    borderColor: '#f1f3f4',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
  },
  readyButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  deliveryIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
}); 