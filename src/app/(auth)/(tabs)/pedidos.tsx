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

export default function Pedidos() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { pedidosPendentes, aceitarPedido, recusarPedido } = usePedidos();

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

  console.log('Pedidos pendentes na tela:', pedidosPendentes);

  if (!pedidosPendentes || pedidosPendentes.length === 0) {
    console.log('Nenhum pedido pendente encontrado');
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

  const renderPedido = ({ item }: { item: Pedido }) => {
    console.log('Renderizando pedido:', item);
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
          <Text style={styles.orderId}>Pedido #{item.id.slice(-4)}</Text>
          <TouchableOpacity onPress={() => setExpandedId(isExpanded ? null : item.id)}>
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
              Total: R$ {item.finalPrice.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Lista de Itens */}
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Itens do Pedido</Text>
          {item.items.map((produto, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.itemQuantity}>{produto.quantity}x</Text>
              <Text style={styles.itemName}>{produto.name}</Text>
              <Text style={styles.itemPrice}>
                R$ {(produto.price * produto.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

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
                    Pagamento: {item.payment.method.toUpperCase()}
                    {item.payment.cardFee?.flagName && ` - ${item.payment.cardFee.flagName}`}
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
                  <Text style={styles.addressText}>{endereco.linha1}</Text>
                  {endereco.linha2 ? (
                    <Text style={styles.addressText}>{endereco.linha2}</Text>
                  ) : null}
                  <Text style={styles.addressText}>{endereco.linha3}</Text>
                </View>
              </View>
            )}
            
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>Resumo do Valor</Text>
              <View style={styles.valueContainer}>
                <View style={styles.valueRow}>
                  <Text style={styles.valueLabel}>Subtotal:</Text>
                  <Text style={styles.valueText}>R$ {item.totalPrice.toFixed(2)}</Text>
                </View>
                {item.payment?.cardFee && (
                  <View style={styles.valueRow}>
                    <Text style={styles.valueLabel}>Taxa do Cartão ({item.payment.cardFee.flagName}):</Text>
                    <Text style={styles.valueText}>- R$ {item.payment.cardFee.value.toFixed(2)}</Text>
                  </View>
                )}
                <View style={styles.valueRow}>
                  <Text style={styles.valueLabel}>Taxa de Entrega:</Text>
                  <Text style={styles.valueText}>R$ {item.deliveryFee.toFixed(2)}</Text>
                </View>
                <View style={[styles.valueRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalValue}>R$ {item.finalPrice.toFixed(2)}</Text>
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
              onPress={() => recusarPedido(item.id)}
            >
              <Ionicons name="close-circle-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>Recusar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.acceptButton]}
              onPress={() => aceitarPedido(item)}
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
          data={pedidosPendentes}
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
    position: 'relative',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 100,
    height: 100,
    zIndex: 9999,
  },
  testButton: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'purple',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    zIndex: 10000,
  },
  list: {
    padding: 16,
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
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemQuantity: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    width: 40,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  itemPrice: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
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