import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePedidos } from '@/contexts/PedidosContext';
import { Pedido } from '@/contexts/PedidosContext';
import { EmptyState } from '@/components/EmptyState';

export default function Preparando() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { pedidosCozinha, marcarComoPronto } = usePedidos();

  if (pedidosCozinha.length === 0) {
    return (
      <EmptyState
        icon="hourglass-outline"
        title="Nenhum pedido em preparo"
        message="Os pedidos aceitos aparecerão aqui para serem preparados."
      />
    );
  }

  const renderPedido = ({ item }: { item: Pedido }) => {
    const isExpanded = expandedId === item.id;

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
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Endereço de Entrega:</Text>
              <Text style={styles.infoText}>{endereco}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity 
          style={styles.readyButton}
          onPress={() => marcarComoPronto(item.id)}
        >
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <Text style={styles.readyButtonText}>Marcar como Pronto</Text>
        </TouchableOpacity>
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
  readyButton: {
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
  readyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
}); 