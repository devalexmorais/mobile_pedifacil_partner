import React from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { ProductCard } from './ProductCard';
import { Product } from '@/types/product';

interface CategoryProductsViewProps {
  products: Product[];
  onProductPress: (product: Product) => void;
  onEditProduct: (product: Product) => void;
  onToggleAvailability: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
  onTogglePromotion?: (product: Product) => void;
  isPremium?: boolean;
  defaultImage: string;
}

export function CategoryProductsView({
  products,
  onProductPress,
  onEditProduct,
  onToggleAvailability,
  onDeleteProduct,
  onTogglePromotion,
  isPremium = false,
  defaultImage
}: CategoryProductsViewProps) {
  if (products.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Nenhum produto encontrado nesta categoria</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          onPress={() => onProductPress(product)}
          onEdit={() => onEditProduct(product)}
          onToggleAvailability={() => onToggleAvailability(product)}
          onDelete={() => onDeleteProduct(product)}
          onTogglePromotion={onTogglePromotion ? () => onTogglePromotion(product) : undefined}
          isPremium={isPremium}
          defaultImage={defaultImage}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 80, // Espaço extra na parte inferior
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f9f9f9',
    height: 300,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  }
}); 