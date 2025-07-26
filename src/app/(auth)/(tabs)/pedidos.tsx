import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePedidos, Pedido } from '../../../contexts/PedidosContext';
import { EmptyState } from '../../../components/EmptyState';
import { FloatingButton } from '../../../components/FloatingButton';
import { colors } from '../../../styles/theme/colors';
import { establishmentSettingsService } from '../../../services/establishmentSettingsService';
import { notificationService } from '../../../services/notificationService';
import { useAuth } from '../../../contexts/AuthContext';

// Adicionando interface para o tipo do cupom
interface CouponApplied {
  code: string;
  createdAt: any;
  discountPercentage: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  originalValue: number;
  usedAt: any;
  usedBy: string[];
  validUntil: string;
  validUntilTime: string;
  value: number;
}

// Atualizando a interface Pedido para incluir o tipo correto do cupom
interface PedidoExtended extends Pedido {
  couponApplied?: CouponApplied;
}

export default function Pedidos() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { pedidosPendentes, aceitarPedido, recusarPedido } = usePedidos();
  const { user } = useAuth();
  const pedidosPendentesExtended = pedidosPendentes as PedidoExtended[];

  useEffect(() => {
    initializeSettings();
  }, []);

  const initializeSettings = async () => {
    try {
      await establishmentSettingsService.initializeSettings();
    } catch (error) {
      console.error('Erro ao inicializar configurações:', error);
    }
  };

  if (!pedidosPendentes || pedidosPendentes.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <EmptyState
          icon="receipt-outline"
          title="Nenhum pedido pendente"
          message="Os novos pedidos aparecerão aqui para serem aceitos ou recusados."
        />
        <FloatingButton />
      </SafeAreaView>
    );
  }

  // Função auxiliar para marcar notificação como lida
  const markNotificationAsRead = async (pedidoId: string) => {
    try {
      const notifications = await notificationService.getNotifications();
      const pedidoNotification = notifications.find(
        notification => 
          notification.data?.orderId === pedidoId && 
          !notification.read
      );

      if (pedidoNotification) {
        await notificationService.markAsRead(pedidoNotification.id);
      }
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  const handleExpandPedido = async (pedidoId: string) => {
    try {
      // Se está fechando o pedido, não precisa fazer nada
      if (expandedId === pedidoId) {
        setExpandedId(null);
        return;
      }

      // Marca o pedido como expandido
      setExpandedId(pedidoId);

      // Marca a notificação como lida
      await markNotificationAsRead(pedidoId);
    } catch (error) {
      console.error('Erro ao expandir pedido:', error);
      // Continua expandindo o pedido mesmo se houver erro
      setExpandedId(pedidoId);
    }
  };

  const handleAceitarPedido = async (pedido: Pedido) => {
    try {
      // Marca a notificação como lida
      await markNotificationAsRead(pedido.id);
      
      // Aceita o pedido
      await aceitarPedido(pedido);
      
      // Enviar notificação de pedido aceito (como cupom)
      await notificationService.sendOrderStatusNotificationToUser(
        pedido.userId,
        pedido.id,
        'preparing'
      );
    } catch (error) {
      console.error('Erro ao aceitar pedido:', error);
      Alert.alert(
        'Erro',
        'Não foi possível aceitar o pedido. Tente novamente.'
      );
    }
  };

  const handleRecusarPedido = async (pedidoId: string, userId: string) => {
    try {
      // Marca a notificação como lida
      await markNotificationAsRead(pedidoId);
      
      // Recusa o pedido
      await recusarPedido(pedidoId);
      
      // Enviar notificação de pedido cancelado (como cupom)
      await notificationService.sendOrderStatusNotificationToUser(
        userId,
        pedidoId,
        'cancelled'
      );
    } catch (error) {
      console.error('Erro ao recusar pedido:', error);
      Alert.alert(
        'Erro',
        'Não foi possível recusar o pedido. Tente novamente.'
      );
    }
  };

  const renderPedido = ({ item }: { item: PedidoExtended }) => {
    const isExpanded = expandedId === item.id;
    
    // Formata o endereço de forma simplificada
    const endereco = {
      linha1: `${item.address.street}, ${item.address.number}`,
      linha2: item.address.complement ? item.address.complement : '',
      linha3: item.address.neighborhood
    };

    return (
      <View style={styles.card}>
        {/* Cabeçalho com ID do Pedido */}
        <View style={styles.orderIdHeader}>
          <Text style={styles.orderId}>Pedido #{item.id.slice(0, 8)}</Text>
          <TouchableOpacity onPress={() => handleExpandPedido(item.id)}>
            <Ionicons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={24} 
              color="#666"
            />
          </TouchableOpacity>
        </View>

        {/* Informações Básicas do Pedido */}
        <View style={styles.basicInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              Feito às {(() => {
                const timestamp = item.updatedAt;
                const date = new Date(timestamp.seconds * 1000);
                return date.toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'America/Sao_Paulo',
                  hour12: false
                });
              })()}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              Total: R$ {(item.finalPrice || 0).toFixed(2)}
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
            {item.items.map((produto, index) => {
              // Calcular preço total do item incluindo opcionais
              let precoItemComOpcionais = produto.price * produto.quantity;
              if (produto.options && produto.options.length > 0) {
                produto.options.forEach(option => {
                  precoItemComOpcionais += (option.price || 0);
                });
              }
              
              return (
                <View key={index} style={styles.itemContainer}>
                  <View style={styles.itemRow}>
                    <Text style={styles.itemQuantity}>{produto.quantity}x</Text>
                    <Text style={styles.itemName}>{produto.name}</Text>
                    <Text style={styles.itemPrice}>
                      R$ {(produto.price * produto.quantity).toFixed(2)}
                    </Text>
                  </View>
                  {produto.options && produto.options.length > 0 && (
                    <View style={styles.optionsContainer}>
                      {produto.options.map((option, optionIndex) => (
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
                  {produto.options && produto.options.length > 0 && (
                    <View style={styles.itemTotalRow}>
                      <Text style={styles.itemTotalLabel}>Total:</Text>
                      <Text style={styles.itemTotalValue}>
                        R$ {precoItemComOpcionais.toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Informações do Cliente e Detalhes */}
        {isExpanded && (
          <View style={styles.details}>
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>Informações do Cliente</Text>
              <View style={styles.clientInfoContainer}>
                <View style={styles.infoRow}>
                  <Ionicons name="person-outline" size={16} color="#666" />
                  <Text style={styles.infoText}>
                    {item.userName || 'Cliente não identificado'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="card-outline" size={16} color="#666" />
                  <Text style={styles.infoText}>
                    Pagamento: {item.payment?.method === 'money' ? 'DINHEIRO' : item.payment?.method?.toUpperCase() || 'NÃO INFORMADO'}
                    {item.payment?.cardFee?.flagName && ` - ${item.payment?.cardFee?.flagName}`}
                    {item.payment?.method === 'money' && item.payment?.changeFor && (
                      item.payment?.changeFor === 'sem_troco' 
                        ? ' - Sem troco'
                        : ` - Troco para R$ ${Number(item.payment?.changeFor).toFixed(2)} (R$ ${(Number(item.payment?.changeFor) - (item.finalPrice || 0)).toFixed(2)})`
                    )}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons 
                    name={item.deliveryMode === 'pickup' ? 'storefront-outline' : 'bicycle-outline'} 
                    size={16} 
                    color="#666" 
                  />
                  <Text style={styles.infoText}>
                    {item.deliveryMode === 'pickup' ? 'Retirada no local' : 'Entrega'}
                  </Text>
                </View>
              </View>
            </View>

            {item.deliveryMode === 'delivery' && (
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Endereço de Entrega</Text>
                <View style={styles.addressContainer}>
                  <Text style={styles.addressText}>Rua: {endereco.linha1}</Text>
                  {endereco.linha2 ? (
                    <Text style={styles.addressText}>Complemento: {endereco.linha2}</Text>
                  ) : null}
                  <Text style={styles.addressText}>Bairro: {endereco.linha3}</Text>
                </View>
              </View>
            )}
            
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>Resumo do Valor</Text>
              <View style={styles.valueContainer}>
                <View style={styles.valueRow}>
                  <Text style={styles.valueLabel}>Subtotal:</Text>
                  <Text style={styles.valueText}>R$ {(item.totalPrice || 0).toFixed(2)}</Text>
                </View>
                {item.payment?.cardFee && (
                  <View style={styles.valueRow}>
                    <Text style={styles.valueLabel}>Taxa do Cartão ({item.payment?.cardFee?.flagName}):</Text>
                    <Text style={styles.valueText}>- R$ {(item.payment?.cardFee?.value || 0).toFixed(2)}</Text>
                  </View>
                )}
                <View style={styles.valueRow}>
                  <Text style={styles.valueLabel}>Taxa de Entrega:</Text>
                  <Text style={styles.valueText}>R$ {(item.deliveryFee || 0).toFixed(2)}</Text>
                </View>
                {item.hasCoupon && item.couponApplied && (
                  <View style={styles.valueRow}>
                    <Text style={[styles.valueLabel, { color: '#28a745' }]}>Desconto do Cupom ({item.couponApplied.discountPercentage}%):</Text>
                    <Text style={[styles.valueText, { color: '#28a745' }]}>
                      - R$ {(((item.totalPrice || 0) * (item.couponApplied.discountPercentage || 0)) / 100).toFixed(2)}
                    </Text>
                  </View>
                )}
                <View style={[styles.valueRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalValue}>R$ {(item.finalPrice || 0).toFixed(2)}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Ações do Pedido */}
        <View style={styles.footer}>
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.button, styles.rejectButton]}
              onPress={() => handleRecusarPedido(item.id, item.userId)}
            >
              <Ionicons name="close-circle-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>Recusar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.acceptButton]}
              onPress={() => handleAceitarPedido(item)}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>Aceitar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <FlatList
          data={pedidosPendentesExtended}
          renderItem={renderPedido}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          style={{flex: 1, width: '100%'}}
        />
      </View>
      
      <FloatingButton />
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  clientInfoContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    gap: 8,
  },
  valueContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  content: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemContainer: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 4,
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
  optionsContainer: {
    marginLeft: 20,
    marginBottom: 4,
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
  details: {
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  detailsSection: {
    marginBottom: 16,
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
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  valueLabel: {
    fontSize: 14,
    color: '#666',
  },
  valueText: {
    fontSize: 14,
    color: '#333',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  footer: {
    padding: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  alternativeFloatingButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.orange,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    zIndex: 20000,
  },
});