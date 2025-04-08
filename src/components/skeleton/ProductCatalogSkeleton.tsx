import React from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { SkeletonItem } from './SkeletonItem';

/**
 * Componente de skeleton para a tela de catálogo de produtos
 */
export const ProductCatalogSkeleton = () => {
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
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <SkeletonItem 
              key={`category-${item}`} 
              width={80} 
              height={26} 
              style={{ 
                borderRadius: 16, 
                marginHorizontal: 4,
              }}
            />
          ))}
        </ScrollView>
      </View>

      {/* Lista de produtos */}
      <ScrollView 
        style={styles.productsList}
        contentContainerStyle={styles.productsListContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Primeira categoria */}
        <View style={styles.categorySection}>
          <SkeletonItem width={120} height={18} style={{ marginBottom: 12, marginLeft: 4 }} />
          
          {/* Produtos da categoria */}
          {[1, 2, 3].map((product) => (
            <View key={`product-1-${product}`} style={styles.productCard}>
              <SkeletonItem width={65} height={65} style={{ borderRadius: 8 }} />
              
              <View style={styles.productInfo}>
                <SkeletonItem width="80%" height={14} style={{ marginBottom: 8 }} />
                <SkeletonItem width="60%" height={12} style={{ marginBottom: 8 }} />
                <SkeletonItem width={80} height={14} />
              </View>
              
              <View style={styles.productActions}>
                <SkeletonItem width={28} height={28} style={{ borderRadius: 14, marginBottom: 8 }} />
                <SkeletonItem width={28} height={28} style={{ borderRadius: 14, marginBottom: 8 }} />
                <SkeletonItem width={28} height={28} style={{ borderRadius: 14 }} />
              </View>
            </View>
          ))}
        </View>

        {/* Segunda categoria */}
        <View style={styles.categorySection}>
          <SkeletonItem width={150} height={18} style={{ marginBottom: 12, marginLeft: 4 }} />
          
          {/* Produtos da categoria */}
          {[1, 2].map((product) => (
            <View key={`product-2-${product}`} style={styles.productCard}>
              <SkeletonItem width={65} height={65} style={{ borderRadius: 8 }} />
              
              <View style={styles.productInfo}>
                <SkeletonItem width="70%" height={14} style={{ marginBottom: 8 }} />
                <SkeletonItem width="50%" height={12} style={{ marginBottom: 8 }} />
                <SkeletonItem width={80} height={14} />
              </View>
              
              <View style={styles.productActions}>
                <SkeletonItem width={28} height={28} style={{ borderRadius: 14, marginBottom: 8 }} />
                <SkeletonItem width={28} height={28} style={{ borderRadius: 14, marginBottom: 8 }} />
                <SkeletonItem width={28} height={28} style={{ borderRadius: 14 }} />
              </View>
            </View>
          ))}
        </View>

        {/* Terceira categoria */}
        <View style={styles.categorySection}>
          <SkeletonItem width={100} height={18} style={{ marginBottom: 12, marginLeft: 4 }} />
          
          {/* Produtos da categoria */}
          {[1, 2, 3, 4].map((product) => (
            <View key={`product-3-${product}`} style={styles.productCard}>
              <SkeletonItem width={65} height={65} style={{ borderRadius: 8 }} />
              
              <View style={styles.productInfo}>
                <SkeletonItem width={`${Math.floor(60 + Math.random() * 30)}%`} height={14} style={{ marginBottom: 8 }} />
                <SkeletonItem width={`${Math.floor(40 + Math.random() * 30)}%`} height={12} style={{ marginBottom: 8 }} />
                <SkeletonItem width={80} height={14} />
              </View>
              
              <View style={styles.productActions}>
                <SkeletonItem width={28} height={28} style={{ borderRadius: 14, marginBottom: 8 }} />
                <SkeletonItem width={28} height={28} style={{ borderRadius: 14, marginBottom: 8 }} />
                <SkeletonItem width={28} height={28} style={{ borderRadius: 14 }} />
              </View>
            </View>
          ))}
        </View>
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