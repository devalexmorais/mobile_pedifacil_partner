import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { ProductWithPromotion } from '@/types/product-catalog';
import { ProductCard } from './product-catalog/ProductCard';
import { colors } from '@/styles/theme/colors';

interface PromotionsListProps {
  products: ProductWithPromotion[];
  onEdit: (product: ProductWithPromotion) => void;
  onTogglePromotion: (product: ProductWithPromotion) => void;
  onToggleActive: (product: ProductWithPromotion) => void;
}

export function PromotionsList({ products, onEdit, onTogglePromotion, onToggleActive }: PromotionsListProps) {
  const promotedProducts = products.filter(product => product.promotion);

  if (promotedProducts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Nenhuma promoção ativa</Text>
        <Text style={styles.emptyDescription}>
          Adicione promoções aos seus produtos para que eles apareçam aqui.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {promotedProducts.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          onEdit={onEdit}
          onTogglePromotion={onTogglePromotion}
          onToggleActive={onToggleActive}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.gray[50],
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.gray[600],
    textAlign: 'center',
    lineHeight: 20,
  },
}); 