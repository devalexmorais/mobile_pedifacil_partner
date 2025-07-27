import React, {useEffect, memo,} from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Product } from '@/types/product';
import OptimizedImage from '../OptimizedImage';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onEdit: () => void;
  onToggleAvailability: () => void;
  onDelete: () => void;
  onTogglePromotion?: () => void;
  isPremium?: boolean;
  isExceedingLimit?: boolean;
  defaultImage: string;
  shouldLoadImage?: boolean;
}

export function ProductCard({
  product,
  onPress,
  onEdit,
  onToggleAvailability,
  onDelete,
  onTogglePromotion,
  isPremium = false,
  isExceedingLimit = false,
  defaultImage,
  shouldLoadImage = true
}: ProductCardProps) {
  useEffect(() => {
    // Este efeito foi removido pois vamos usar product.isPromotion diretamente
  }, []);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.productCard,
          !product.isActive && styles.productCardInactive,
          isExceedingLimit && styles.productCardExceeding
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <OptimizedImage
          uri={product.image || null}
          defaultImage={defaultImage}
          style={styles.productImage}
          borderRadius={8}
          lazy={true}
          shouldLoad={shouldLoadImage}
        />
        
        <View style={styles.productInfo}>
          {isExceedingLimit && (
            <Text style={styles.exceedingLabel}>Excede limite (inativo)</Text>
          )}
          
          <Text style={styles.productName}>{product.name}</Text>
          
          {product.description && (
            <Text style={styles.productDescription} numberOfLines={1}>
              {product.description}
            </Text>
          )}

          {product.isPromotion ? (
            <View style={styles.priceContainer}>
              <View style={styles.promoTag}>
                <MaterialIcons name="local-offer" size={10} color="#FF6B6B" />
                <Text style={styles.promoTagText}>PROMOÇÃO</Text>
              </View>
              <Text style={styles.originalPrice}>
                De R$ {product.price.toFixed(2)}
              </Text>
              <Text style={styles.promoPrice}>
                Por R$ {(product.promotion?.finalPrice || product.price).toFixed(2)}
              </Text>
            </View>
          ) : (
            <Text style={styles.productPrice}>R$ {product.price.toFixed(2)}</Text>
          )}
          
          <Text style={[
            styles.productStatusLabel,
            { color: product.isActive ? '#4CAF50' : '#666' }
          ]}>
            {product.isActive ? 'Ativo' : 'Inativo'}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.menuButton} 
          onPress={onPress}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="#666" />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}

// Memoização para evitar renderizações desnecessárias
const ProductCardMemo = memo(ProductCard, (prevProps, nextProps) => {
  // Comparação mais detalhada para evitar re-renderizações desnecessárias
  const productChanged = 
    prevProps.product.id !== nextProps.product.id ||
    prevProps.product.name !== nextProps.product.name ||
    prevProps.product.description !== nextProps.product.description ||
    prevProps.product.price !== nextProps.product.price ||
    prevProps.product.isActive !== nextProps.product.isActive ||
    prevProps.product.isPromotion !== nextProps.product.isPromotion ||
    prevProps.product.image !== nextProps.product.image ||
    prevProps.product.promotion?.finalPrice !== nextProps.product.promotion?.finalPrice;

  const propsChanged = 
    prevProps.isPremium !== nextProps.isPremium ||
    prevProps.isExceedingLimit !== nextProps.isExceedingLimit ||
    prevProps.shouldLoadImage !== nextProps.shouldLoadImage ||
    prevProps.defaultImage !== nextProps.defaultImage;

  // Só re-renderiza se algo realmente mudou
  return !productChanged && !propsChanged;
});

export { ProductCardMemo };

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 8,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    width: '100%',
    minHeight: 110,
  },
  productImage: {
    width: 85,
    height: 85,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    alignSelf: 'center',
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
  priceContainer: {
    flexDirection: 'column',
    gap: 2,
  },
  originalPrice: {
    fontSize: 12,
    fontWeight: '400',
    color: '#666',
    textDecorationLine: 'line-through',
  },
  promoPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  promoTag: {
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#FF6B6B',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    alignSelf: 'flex-start',
    marginBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  promoTagText: {
    color: '#FF6B6B',
    fontWeight: '600',
    fontSize: 8,
  },
  menuButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  productCardInactive: {
    opacity: 0.7,
    backgroundColor: '#f5f5f5',
  },
  productCardExceeding: {
    backgroundColor: '#FFE0E0',
    borderColor: '#FFA07A',
    borderWidth: 1,
  },
  exceedingLabel: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  productStatusLabel: {
    fontSize: 12,
    marginTop: 4,
  },
}); 