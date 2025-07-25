import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number | string;
    image?: string;
    isAvailable?: boolean;
  };
  onPress?: () => void;
  onEdit?: (product: any) => void;
  onTogglePromotion?: (product: any) => void;
  onToggleActive?: (product: any) => void;
}

export function ProductCard({ product, onPress, onEdit, onTogglePromotion, onToggleActive }: ProductCardProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.imageContainer}>
        <Ionicons name="image-outline" size={40} color="#ccc" />
      </View>
      <View style={styles.content}>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.price}>R$ {typeof product.price === 'number' ? product.price.toFixed(2) : product.price}</Text>
        {product.isAvailable === false && (
          <Text style={styles.unavailable}>Indisponível</Text>
        )}
      </View>
      
      {/* Botões de ação */}
      <View style={styles.actions}>
        {onEdit && (
          <TouchableOpacity style={styles.actionButton} onPress={() => onEdit(product)}>
            <Ionicons name="create-outline" size={20} color="#666" />
          </TouchableOpacity>
        )}
        {onToggleActive && (
          <TouchableOpacity style={styles.actionButton} onPress={() => onToggleActive(product)}>
            <Ionicons name={product.isAvailable ? "eye-outline" : "eye-off-outline"} size={20} color="#666" />
          </TouchableOpacity>
        )}
        {onTogglePromotion && (
          <TouchableOpacity style={styles.actionButton} onPress={() => onTogglePromotion(product)}>
            <Ionicons name="pricetag-outline" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    height: 120,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  price: {
    fontSize: 14,
    color: '#666',
  },
  unavailable: {
    fontSize: 12,
    color: '#ff4444',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
});
