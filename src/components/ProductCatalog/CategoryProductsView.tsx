import React, { memo } from 'react';
import { View, StyleSheet, FlatList, Text } from 'react-native';
import { ProductCardMemo } from './ProductCard';
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
  shouldLoadImages?: boolean;
}

const CategoryProductsView = memo(function CategoryProductsView({
  products,
  onProductPress,
  onEditProduct,
  onToggleAvailability,
  onDeleteProduct,
  onTogglePromotion,
  isPremium = false,
  defaultImage,
  shouldLoadImages = true
}: CategoryProductsViewProps) {
  if (products.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Nenhum produto encontrado nesta categoria</Text>
      </View>
    );
  }

  const renderProduct = ({ item: product }: { item: Product }) => (
    <ProductCardMemo
      product={product}
      onPress={() => onProductPress(product)}
      onEdit={() => onEditProduct(product)}
      onToggleAvailability={() => onToggleAvailability(product)}
      onDelete={() => onDeleteProduct(product)}
      onTogglePromotion={onTogglePromotion ? () => onTogglePromotion(product) : undefined}
      isPremium={isPremium}
      defaultImage={defaultImage}
      shouldLoadImage={shouldLoadImages}
    />
  );

  const getItemLayout = (_: any, index: number) => ({
    length: 110, // Altura real do ProductCard (85px imagem + 12px padding + 13px espaçamento)
    offset: 110 * index,
    index,
  });

  return (
    <FlatList
      data={products}
      renderItem={renderProduct}
      keyExtractor={(item) => item.id}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={true}
      maxToRenderPerBatch={5}
      windowSize={5}
      initialNumToRender={6}
      getItemLayout={getItemLayout}
      updateCellsBatchingPeriod={50}
      disableVirtualization={false}
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
        autoscrollToTopThreshold: 10,
      }}
    />
  );
});

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

export { CategoryProductsView };