import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { colors } from '@/styles/theme/colors';
import { ProductWithPromotion } from '@/types/product-catalog';
import { ProductCard } from './ProductCard';

interface ProductListProps {
  products: ProductWithPromotion[];
  onEdit: (product: ProductWithPromotion) => void;
  onTogglePromotion: (product: ProductWithPromotion) => void;
  onToggleActive: (product: ProductWithPromotion) => void;
}

export function ProductList({ 
  products, 
  onEdit, 
  onTogglePromotion,
  onToggleActive 
}: ProductListProps) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {products.map(product => (
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
    padding: 16,
    paddingBottom: 30,
    backgroundColor: colors.gray[100],
  },
}); 