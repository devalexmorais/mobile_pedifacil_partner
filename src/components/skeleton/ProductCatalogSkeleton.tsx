import React, { memo } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { SkeletonItem } from './SkeletonItem';

// Memoizamos componentes que podem ser reutilizados
const CategorySkeleton = memo(({ index }: { index: number }) => (
  <View style={styles.categorySection}>
    <SkeletonItem 
      width={100 + (index % 3) * 20} 
      height={18} 
      style={{ marginBottom: 12, marginLeft: 4 }} 
      shimmerEnabled={index < 2} // Só habilitamos shimmer nas primeiras categorias
    />
  </View>
));

const ProductCardSkeleton = memo(({ index }: { index: number }) => (
  <View style={styles.productCard}>
    <SkeletonItem width={65} height={65} style={{ borderRadius: 8 }} shimmerEnabled={index < 4} />
    
    <View style={styles.productInfo}>
      <SkeletonItem 
        width={`${Math.floor(70 + (index % 3) * 10)}%`} 
        height={14} 
        style={{ marginBottom: 8 }} 
        shimmerEnabled={index < 4}
      />
      <SkeletonItem 
        width={`${Math.floor(50 + (index % 3) * 10)}%`} 
        height={12} 
        style={{ marginBottom: 8 }} 
        shimmerEnabled={false}
      />
      <SkeletonItem width={80} height={14} shimmerEnabled={false} />
    </View>
    
    <View style={styles.productActions}>
      <SkeletonItem width={28} height={28} style={{ borderRadius: 14, marginBottom: 8 }} shimmerEnabled={false} />
      <SkeletonItem width={28} height={28} style={{ borderRadius: 14, marginBottom: 8 }} shimmerEnabled={false} />
      <SkeletonItem width={28} height={28} style={{ borderRadius: 14 }} shimmerEnabled={false} />
    </View>
  </View>
));

/**
 * Componente de skeleton otimizado para a tela de catálogo de produtos
 */
export const ProductCatalogSkeleton = () => {
  // Limitar o número de items renderizados para melhor performance
  const maxVisibleCategories = 3;
  const maxProductsPerCategory = [3, 2, 2]; // Número de produtos por categoria
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header com barra de pesquisa e botão de adicionar */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <SkeletonItem width={20} height={20} style={{ borderRadius: 10 }} />
          <SkeletonItem width="80%" height={16} style={{ marginLeft: 10 }} />
        </View>
        <SkeletonItem width={38} height={38} style={{ borderRadius: 8 }} />
      </View>

      {/* Lista de categorias */}
      <View style={styles.categoriesScroll}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonItem 
              key={`category-${index}`} 
              width={80} 
              height={26} 
              style={{ 
                borderRadius: 16, 
                marginHorizontal: 4,
              }}
              shimmerEnabled={index < 3} // Apenas as primeiras têm shimmer
            />
          ))}
        </ScrollView>
      </View>

      {/* Lista de produtos - usando window com limitação de renderização */}
      <ScrollView 
        style={styles.productsList}
        contentContainerStyle={styles.productsListContent}
        showsVerticalScrollIndicator={false}
      >
        {Array.from({ length: maxVisibleCategories }).map((_, categoryIndex) => (
          <View key={`category-section-${categoryIndex}`} style={styles.categorySection}>
            <CategorySkeleton index={categoryIndex} />
            
            {Array.from({ length: maxProductsPerCategory[categoryIndex] || 0 }).map((_, productIndex) => (
              <ProductCardSkeleton 
                key={`product-${categoryIndex}-${productIndex}`} 
                index={categoryIndex * 4 + productIndex} 
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 25,
    paddingHorizontal: 15,
    marginRight: 10,
    height: 40,
  },
  categoriesScroll: {
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    height: 50,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  categoriesContent: {
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  productsList: {
    padding: 8,
    marginTop: 4,
  },
  productsListContent: {
    paddingBottom: 150,
  },
  categorySection: {
    marginBottom: 16,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  productInfo: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'space-between',
  },
  productActions: {
    justifyContent: 'space-between',
    paddingLeft: 8,
  },
}); 