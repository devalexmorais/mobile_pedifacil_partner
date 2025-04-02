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
  isPromotion?: boolean;
  promotionalPrice?: number;
  promotion?: {
    discountType: 'percentage' | 'fixed';
    discountValue: number;
  };
}

interface ProductCardProps {
  product: Product;
  isExceedingLimit: boolean;
  isPremium: boolean;
  onToggleAvailability: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPress: () => void;
  onTogglePromotion?: () => void;
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
  onTogglePromotion,
  defaultImage
}: ProductCardProps) {
  const calculatePromotionalPrice = () => {
    if (!product.promotion) return null;

    const originalPrice = product.price;
    const { discountType, discountValue } = product.promotion;

    // Se for desconto fixo, subtrai o valor diretamente
    if (discountType === 'fixed') {
      return originalPrice - discountValue;
    }
    
    // Se for porcentagem, calcula a porcentagem do preço
    return originalPrice * (1 - discountValue / 100);
  };

  const promotionalPrice = calculatePromotionalPrice();

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
          <View>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productDescription} numberOfLines={2}>
              {product.description}
            </Text>
          </View>
          <View>
            {product.isPromotion ? (
              <View>
                <Text style={[styles.productPrice, styles.originalPrice]}>
                  R$ {product.price.toFixed(2)}
                </Text>
                <Text style={[styles.productPrice, styles.promotionalPrice]}>
                  R$ {promotionalPrice?.toFixed(2)}
                </Text>
              </View>
            ) : (
              <Text style={styles.productPrice}>
                R$ {product.price.toFixed(2)}
              </Text>
            )}
          </View>
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
              color={product.isActive ? "#4CAF50" : "#666"}
            />
          </TouchableOpacity>
          {isPremium && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onTogglePromotion}
            >
              <Ionicons
                name={product.isPromotion ? "pricetag" : "pricetag-outline"}
                size={20}
                color={product.isPromotion ? "#FFA500" : "#666"}
              />
            </TouchableOpacity>
          )}
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
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFA500',
  },
  originalPrice: {
    textDecorationLine: 'line-through',
    color: '#999',
    fontSize: 12,
  },
  promotionalPrice: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: 'bold',
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