import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/styles/theme/colors';
import { ProductWithPromotion } from '@/types/product-catalog';

interface ProductCardProps {
  product: ProductWithPromotion;
  onEdit: (product: ProductWithPromotion) => void;
  onTogglePromotion: (product: ProductWithPromotion) => void;
  onToggleActive: (product: ProductWithPromotion) => void;
}

export function ProductCard({ 
  product, 
  onEdit, 
  onTogglePromotion,
  onToggleActive 
}: ProductCardProps) {
  const isPromoted = !!product.promotion;

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        isPromoted && styles.promotedContainer,
        !product.isActive && styles.inactiveContainer
      ]} 
      onPress={() => onEdit(product)}
    >
      <View style={styles.contentContainer}>
        <Image 
          source={{ uri: product.image }} 
          style={styles.image} 
        />
        <View style={styles.infoContainer}>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.description}>{product.description}</Text>
          <View style={styles.priceContainer}>
            {isPromoted ? (
              <>
                <Text style={styles.oldPrice}>R$ {product.price}</Text>
                <Text style={styles.promotionalPrice}>
                  R$ {product.promotion?.discountValue}
                </Text>
              </>
            ) : (
              <Text style={styles.price}>R$ {product.price}</Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, !product.isActive && styles.activateButton]}
          onPress={() => onToggleActive(product)}
        >
          <Ionicons 
            name={product.isActive ? "pause-circle" : "play-circle"} 
            size={20} 
            color={product.isActive ? colors.gray[600] : colors.green[500]} 
          />
          <Text style={[
            styles.actionButtonText,
            !product.isActive && styles.activateButtonText
          ]}>
            {product.isActive ? 'Pausar Produto' : 'Ativar Produto'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, isPromoted && styles.removePromotionButton]}
          onPress={() => onTogglePromotion(product)}
        >
          <Ionicons 
            name={isPromoted ? "pricetag" : "pricetag-outline"} 
            size={20} 
            color={isPromoted ? colors.red[500] : colors.orange} 
          />
          <Text style={[
            styles.actionButtonText,
            isPromoted && styles.removePromotionText
          ]}>
            {isPromoted ? 'Remover Promoção' : 'Adicionar Promoção'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  promotedContainer: {
    borderColor: colors.orange,
    borderWidth: 2,
  },
  inactiveContainer: {
    opacity: 0.7,
    borderColor: colors.gray[300],
    borderWidth: 2,
  },
  contentContainer: {
    flexDirection: 'row',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: colors.gray[600],
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[800],
  },
  oldPrice: {
    fontSize: 14,
    color: colors.gray[500],
    textDecorationLine: 'line-through',
  },
  promotionalPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.orange,
  },
  buttonsContainer: {
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray[100],
    padding: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray[600],
  },
  removePromotionButton: {
    backgroundColor: colors.red[50],
  },
  removePromotionText: {
    color: colors.red[500],
  },
  activateButton: {
    backgroundColor: colors.green[50],
  },
  activateButtonText: {
    color: colors.green[500],
  },
}); 