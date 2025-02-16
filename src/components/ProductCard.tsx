import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { colors } from '@/styles/theme/colors';
import { ProductWithPromotion } from '@/types/product';

interface ProductCardProps {
  product: ProductWithPromotion;
  onTogglePromotion: (product: ProductWithPromotion) => void;
  calculatePromotionalPrice?: (originalPrice: string, promotion: any) => string;
  showPromotionButton?: boolean;
}

export function ProductCard({
  product,
  onTogglePromotion,
  calculatePromotionalPrice,
  showPromotionButton = false,
}: ProductCardProps) {
  return (
    <TouchableOpacity 
      style={[
        styles.productItem,
        product.promotion && styles.promotionItem
      ]}
    >
      <View style={styles.productContainer}>
        <Image source={{ uri: product.image }} style={styles.productImage} />
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productDescription}>{product.description}</Text>
          <View style={styles.priceContainer}>
            <Text style={[
              styles.productPrice,
              product.promotion && styles.oldPrice
            ]}>
              {product.price}
            </Text>
            {product.promotion && calculatePromotionalPrice && (
              <Text style={styles.promotionalPrice}>
                R$ {calculatePromotionalPrice(product.price, product.promotion)}
              </Text>
            )}
          </View>
        </View>
      </View>
      {showPromotionButton && (
        <TouchableOpacity 
          onPress={() => onTogglePromotion(product)} 
          style={[
            styles.toggleButton,
            product.promotion && styles.removePromotionButton
          ]}
        >
          <Text style={[
            styles.toggleButtonText,
            product.promotion && styles.removePromotionText
          ]}>
            {product.promotion ? "Remover da Promoção" : "Adicionar à Promoção"}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  productItem: {
    marginBottom: 16,
    padding: 16,
    borderColor: colors.gray[200],
    borderWidth: 1,
    borderRadius: 16,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4.65,
    elevation: 4,
  },
  productContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginRight: 16,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 6,
    color: colors.gray[800],
  },
  productDescription: {
    fontSize: 14,
    color: colors.gray[600],
    marginBottom: 8,
    lineHeight: 20,
  },
  productPrice: {
    color: colors.orange,
    fontWeight: '700',
    fontSize: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  oldPrice: {
    textDecorationLine: 'line-through',
    color: colors.gray[500],
  },
  promotionalPrice: {
    color: colors.orange,
    fontWeight: '700',
    fontSize: 16,
  },
  toggleButton: {
    backgroundColor: colors.gray[100],
    padding: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.orange,
  },
  toggleButtonText: {
    color: colors.orange,
    fontWeight: '600',
    fontSize: 14,
  },
  promotionItem: {
    borderColor: colors.orange,
    borderWidth: 2,
  },
  removePromotionButton: {
    backgroundColor: colors.white,
    borderColor: 'red',
    borderWidth: 1,
  },
  removePromotionText: {
    color: 'red',
  },
}); 