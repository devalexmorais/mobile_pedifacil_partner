import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePedidos } from '@/contexts/PedidosContext';
import { Pedido, OrderItem } from '@/contexts/PedidosContext';
import { EmptyState } from '@/components/EmptyState';
import { notificationService } from '@/services/notificationService';

export default function Preparando() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
      
      // Enviar notificação de pedido pronto
      await notificationService.sendOrderNotification(
        userId,
        notificationService.getOrderStatusMessage('ready', pedidoId, userId)
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
    const isExpanded = expandedId === item.id;
    
    // Converter o timestamp do Firestore para uma data JavaScript
    const createdAtDate = new Date(
      item.createdAt.seconds * 1000 + item.createdAt.nanoseconds / 1000000
    );

    return (
      <View style={styles.pedidoCard}>
        <TouchableOpacity 
          style={[
            styles.pedidoHeader, 
            isExpanded && {backgroundColor: '#f0ead6', borderBottomWidth: 1, borderBottomColor: '#e8d5b5'}
          ]}
          onPress={() => setExpandedId(isExpanded ? null : item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.headerLeft}>
            <Text style={styles.orderTime}>
              Pedido #{item.id.slice(-4)} • {createdAtDate.toLocaleTimeString('pt-BR')}
            </Text>
            <Text style={styles.touchHint}>
              <Ionicons name={isExpanded ? "eye-off-outline" : "eye-outline"} size={12} color="#666" style={{marginRight: 4}} /> 
              {isExpanded ? "Toque para ocultar detalhes" : "Toque para ver detalhes do pedido"}
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
            <Ionicons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#666"
              style={[styles.expandIcon, {backgroundColor: isExpanded ? "#f0f0f0" : "#4CAF5033", padding: 4, borderRadius: 12}]}
            />
          </View>
        </TouchableOpacity>

        {/* Detalhes expandidos */}
        {isExpanded && (
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
        )}

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
    marginBottom: 0,
    backgroundColor: '#fbf5e9',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e8d5b5',
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
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  touchHint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandIcon: {
    marginLeft: 8,
    padding: 6,
    borderRadius: 12,
  },
  expandedContent: {
    paddingTop: 16,
    marginTop: 12,
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
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  selectionsContainer: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 8,
  },
  selectionGroup: {
    marginBottom: 8,
  },
  selectionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  selectionOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectionOption: {
    fontSize: 14,
    color: '#444',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  additionalsContainer: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 8,
  },
  additionalsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  additionalText: {
    fontSize: 14,
    color: '#444',
    marginBottom: 2,
  },
  additionalHighlight: {
    fontWeight: 'bold',
    color: '#222',
    fontSize: 15,
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  infoSection: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 8,
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
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  readyButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  deliveryIndicator: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f9f3e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#e8d5b5',
  },
}); 