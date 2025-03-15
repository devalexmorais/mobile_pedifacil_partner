import React from 'react';
import { View, Modal, ScrollView, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProductOption {
  name: string;
  price?: number;
}

interface ProductVariation {
  name: string;
  options: ProductOption[];
}

interface RequiredSelection {
  name: string;
  minRequired: number;
  maxRequired: number;
  options: ProductOption[];
}

interface Extra {
  name: string;
  extraPrice: number;
  minRequired: number;
  maxRequired: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  categoryId?: string;
  image?: string;
  isActive: boolean;
  isPromotion: boolean;
  createdAt: Date;
  updatedAt: Date;
  sellerId: string;
  variations: ProductVariation[];
  requiredSelections: RequiredSelection[];
  extras: Extra[];
}

interface ProductDetailsModalProps {
  visible: boolean;
  product: Product | null;
  onClose: () => void;
  defaultImage: string;
}

export function ProductDetailsModal({
  visible,
  product,
  onClose,
  defaultImage
}: ProductDetailsModalProps) {
  if (!product) return null;

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Detalhes do Produto</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView style={styles.scrollContent}>
            {/* Imagem do Produto */}
            <Image 
              source={{ uri: product.image || defaultImage }} 
              style={styles.productImage} 
              resizeMode="cover"
            />

            {/* Informações Básicas */}
            <View style={styles.infoSection}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productCategory}>Categoria: {product.category}</Text>
              <Text style={styles.productPrice}>{formatPrice(product.price)}</Text>
              
              <Text style={styles.productStatus}>
                Status: <Text style={{color: product.isActive ? '#4CAF50' : '#F44336'}}>
                  {product.isActive ? 'Ativo' : 'Inativo'}
                </Text>
              </Text>

              {product.isPromotion && (
                <View style={styles.promotionLabel}>
                  <Ionicons name="pricetag" size={16} color="#fff" />
                  <Text style={styles.promotionText}>Em Promoção</Text>
                </View>
              )}
            </View>

            {/* Descrição */}
            {product.description ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Descrição</Text>
                <Text style={styles.description}>{product.description}</Text>
              </View>
            ) : null}

            {/* Variações */}
            {product.variations && product.variations.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Variações</Text>
                {product.variations.map((variation, index) => (
                  <View key={index} style={styles.variationItem}>
                    <Text style={styles.variationName}>{variation.name}</Text>
                    {variation.options.map((option, optIndex) => (
                      <View key={optIndex} style={styles.optionItem}>
                        <Text style={styles.optionName}>{option.name}</Text>
                        {option.price !== undefined && (
                          <Text style={styles.optionPrice}>{formatPrice(option.price)}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ) : null}

            {/* Seleções Obrigatórias */}
            {product.requiredSelections && product.requiredSelections.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Seleções Obrigatórias</Text>
                {product.requiredSelections.map((selection, index) => (
                  <View key={index} style={styles.selectionItem}>
                    <View style={styles.selectionHeader}>
                      <Text style={styles.selectionName}>{selection.name}</Text>
                      <Text style={styles.selectionRequirement}>
                        {selection.minRequired === selection.maxRequired 
                          ? `Escolha ${selection.minRequired}` 
                          : `Escolha de ${selection.minRequired} a ${selection.maxRequired}`}
                      </Text>
                    </View>
                    {selection.options.map((option, optIndex) => (
                      <View key={optIndex} style={styles.optionItem}>
                        <Text style={styles.optionName}>{option.name}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ) : null}

            {/* Extras */}
            {product.extras && product.extras.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Extras</Text>
                {product.extras.map((extra, index) => (
                  <View key={index} style={styles.extraItem}>
                    <View style={styles.extraHeader}>
                      <Text style={styles.extraName}>{extra.name}</Text>
                      <Text style={styles.extraPrice}>{formatPrice(extra.extraPrice)}</Text>
                    </View>
                    <Text style={styles.extraRequirement}>
                      {extra.minRequired === 0 
                        ? `Opcional (máximo: ${extra.maxRequired})` 
                        : `Obrigatório: ${extra.minRequired} a ${extra.maxRequired}`}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Data de Atualização */}
            <View style={styles.section}>
              <Text style={styles.lastUpdated}>
                Última atualização: {product.updatedAt.toLocaleDateString('pt-BR')}
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSpacer: {
    width: 28,
  },
  scrollContent: {
    flex: 1,
  },
  productImage: {
    width: '100%',
    height: 200,
  },
  infoSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  productName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFA500',
    marginBottom: 8,
  },
  productStatus: {
    fontSize: 14,
    color: '#666',
  },
  promotionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFA500',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 8,
  },
  promotionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  variationItem: {
    marginBottom: 16,
  },
  variationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
    marginBottom: 4,
  },
  optionName: {
    fontSize: 14,
    color: '#333',
  },
  optionPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFA500',
  },
  selectionItem: {
    marginBottom: 16,
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  selectionRequirement: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  extraItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  extraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  extraName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  extraPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFA500',
  },
  extraRequirement: {
    fontSize: 12,
    color: '#666',
  },
  lastUpdated: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 8,
  }
}); 