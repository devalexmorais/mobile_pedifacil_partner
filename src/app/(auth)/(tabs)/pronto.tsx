import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePedidos } from '../../../contexts/PedidosContext';
import { EmptyState } from '../../../components/EmptyState';
import { Pedido } from '../../../contexts/PedidosContext';

// Estendendo o tipo Pedido para incluir status
interface PedidoWithStatus extends Pedido {
  status?: string;
}

export default function Pronto() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { pedidosProntos, marcarComoEmEntrega, marcarComoEntregue } = usePedidos();

  if (pedidosProntos.length === 0) {
    return (
      <EmptyState
        icon="checkmark-circle-outline"
        title="Nenhum pedido pronto"
        message="Os pedidos prontos para entrega aparecerão aqui."
      />
    );
  }

  const renderPedido = ({ item }: { item: Pedido }) => {
    const isExpanded = expandedId === item.id;
    const isPickup = item.deliveryMode === 'pickup';

    // Formata o endereço completo
    const endereco = `${item.address.street}, ${item.address.number}${item.address.complement ? ` - ${item.address.complement}` : ''}\n${item.address.neighborhood}, ${item.address.city} - ${item.address.state}`;

    return (
      <View style={styles.pedidoCard}>
        <TouchableOpacity 
          style={styles.pedidoHeader}
          onPress={() => setExpandedId(isExpanded ? null : item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.headerLeft}>
            <Text style={styles.orderTime}>
              Pedido feito às {new Date(item.createdAt).toLocaleTimeString('pt-BR')}
            </Text>
            <Text style={styles.paymentMethod}>
              Pagamento: {item.payment.method.toUpperCase()}
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
            {/* Modo de entrega */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Tipo de Pedido:</Text>
              <Text style={styles.infoText}>
                {item.deliveryMode === 'pickup' ? 'Retirada no local' : 'Entrega'}
              </Text>
            </View>
            
            {/* Só mostra endereço se for entrega */}
            {item.deliveryMode === 'delivery' && (
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Endereço de Entrega:</Text>
                <Text style={styles.infoText}>{endereco}</Text>
              </View>
            )}
          </View>
        )}

        {/* Botões de ação */}
        <TouchableOpacity 
          style={[styles.deliveryButton, isPickup && styles.pickupButton]}
          onPress={() => marcarComoEmEntrega(item.id)}
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
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
  deliveredButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
}); 