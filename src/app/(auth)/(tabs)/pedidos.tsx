import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePedidos } from '../../../contexts/PedidosContext';
import { EmptyState } from '../../../components/EmptyState';
import { Pedido } from '../../../contexts/PedidosContext';

export default function Pedidos() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { pedidosPendentes, aceitarPedido, recusarPedido } = usePedidos();

  console.log('Pedidos pendentes na tela:', pedidosPendentes);

  if (!pedidosPendentes || pedidosPendentes.length === 0) {
    console.log('Nenhum pedido pendente encontrado');
    return (
      <EmptyState
        icon="receipt-outline"
        title="Nenhum pedido pendente"
        message="Os novos pedidos aparecerão aqui para serem aceitos ou recusados."
      />
    );
  }

  const renderPedido = ({ item }: { item: Pedido }) => {
    console.log('Renderizando pedido:', item);
    const isExpanded = expandedId === item.id;
    
    // Formata o endereço completo
    const endereco = `${item.address.street}, ${item.address.number}${item.address.complement ? ` - ${item.address.complement}` : ''}\n${item.address.neighborhood}, ${item.address.city} - ${item.address.state}`;

    return (
      <View style={styles.card}>
        <TouchableOpacity 
          style={styles.header}
          onPress={() => setExpandedId(isExpanded ? null : item.id)}
        >
          <View style={styles.headerContent}>
            <Text style={styles.orderTime}>
              Pedido feito às {new Date(item.createdAt).toLocaleTimeString('pt-BR')}
            </Text>
            <Text style={styles.paymentMethod}>
              Pagamento: {item.payment.method.toUpperCase()}
            </Text>
          </View>
          <Ionicons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={24} 
            color="#666"
          />
        </TouchableOpacity>

        <View style={styles.content}>
          {item.items.map((produto, index) => (
            <Text key={index} style={styles.item}>
              {produto.quantity}x {produto.name}
            </Text>
          ))}
        </View>

        {isExpanded && (
          <View style={styles.details}>
            <Text style={styles.detailsTitle}>Detalhes do Pedido:</Text>
            <Text style={styles.detailsText}>Endereço: {endereco}</Text>
            <Text style={styles.detailsText}>
              Valor Total: R$ {item.totalPrice.toFixed(2)}
            </Text>
            <Text style={styles.detailsText}>
              Taxa de Entrega: R$ {item.deliveryFee.toFixed(2)}
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.total}>
            Total: R$ {item.finalPrice.toFixed(2)}
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.button, styles.rejectButton]}
              onPress={() => recusarPedido(item.id)}
            >
              <Text style={styles.buttonText}>Recusar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.acceptButton]}
              onPress={() => aceitarPedido(item)}
            >
              <Text style={styles.buttonText}>Aceitar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={pedidosPendentes}
        renderItem={renderPedido}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerContent: {
    flex: 1,
  },
  orderTime: {
    fontSize: 14,
    color: '#666',
  },
  paymentMethod: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  item: {
    fontSize: 14,
    marginBottom: 4,
  },
  details: {
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  detailsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  footer: {
    padding: 16,
  },
  total: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '500',
  },
});