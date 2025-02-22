import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  isActive: boolean;
}

interface ProductCardProps {
  product: Product;
  isExceedingLimit: boolean;
  isPremium: boolean;
  onToggleAvailability: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPress: () => void;
  defaultImage: string;
}

export function ProductCard({
  product,
  isExceedingLimit,
  isPremium,
  onToggleAvailability,
  onEdit,
  onDelete,
  onPress,
  defaultImage
}: ProductCardProps) {
  return (
    <TouchableOpacity onPress={onPress}>
      <View style={[
        styles.productCard,
        !isPremium && isExceedingLimit && styles.productCardExceeding,
        !product.isActive && styles.productCardInactive
      ]}>
        <Image
          source={product.image ? { uri: product.image } : { uri: defaultImage }}
          style={styles.productImage}
        />
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productDescription}>{product.description}</Text>
          <Text style={styles.productPrice}>R$ {product.price.toFixed(2)}</Text>
        </View>
        <View style={styles.productActions}>
          {!isPremium && isExceedingLimit && (
            <Text style={styles.exceedingLabel}>Limite excedido</Text>
          )}
          <TouchableOpacity
            onPress={onToggleAvailability}
            style={[
              styles.availabilityButton,
              product.isActive && styles.availableButton
            ]}
          >
            <Ionicons
              name={product.isActive ? "checkmark-circle" : "close-circle"}
              size={24}
              color={product.isActive ? "#4CAF50" : "#FF3B30"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onEdit}
            style={styles.actionButton}
          >
            <Ionicons name="create-outline" size={20} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onDelete}
            style={styles.actionButton}
          >
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 8,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  productCardExceeding: {
    backgroundColor: '#FFE0E0',
    borderColor: '#FFA07A',
    borderWidth: 1,
  },
  productCardInactive: {
    opacity: 0.7,
    backgroundColor: '#f5f5f5',
  },
  productImage: {
    width: 65,
    height: 65,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
  },
  productInfo: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  productDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFA500',
  },
  productActions: {
    justifyContent: 'space-between',
    paddingLeft: 8,
    gap: 8,
  },
  availabilityButton: {
    padding: 4,
  },
  availableButton: {
    opacity: 1,
  },
  actionButton: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exceedingLabel: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
}); 