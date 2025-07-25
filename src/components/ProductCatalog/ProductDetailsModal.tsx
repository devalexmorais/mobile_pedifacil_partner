import React from 'react';
import { View, Modal, ScrollView, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert, Switch } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import OptimizedImage from '../OptimizedImage';
import { Product } from '@/types/product';

interface ProductDetailsModalProps {
  visible: boolean;
  product: Product | null;
  onClose: () => void;
  onEdit: (product: Product) => Promise<void>;
  onToggleAvailability: (product: Product) => Promise<void>;
  onDelete: (product: Product) => Promise<void>;
  onTogglePromotion?: (product: Product) => Promise<void>;
  onToggleOptionAvailability?: (product: Product, selectionIndex: number, optionIndex: number) => Promise<void>;
  isPremium?: boolean;
  defaultImage: string;
}

export function ProductDetailsModal({
  visible,
  product,
  onClose,
  onEdit,
  onToggleAvailability,
  onDelete,
  onTogglePromotion,
  onToggleOptionAvailability,
  isPremium = false,
  defaultImage,
}: ProductDetailsModalProps) {
  if (!product) return null;

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const handleEdit = async () => {
    await onEdit(product);
    onClose(); // Fecha o modal de detalhes para abrir o modal de edição
  };

  const handleToggleAvailability = async () => {
    await onToggleAvailability(product);
    onClose();
  };

  const handleDelete = () => {
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir este produto?',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await onDelete(product);
            onClose();
          }
        }
      ]
    );
  };

  const handleTogglePromotion = async () => {
    if (onTogglePromotion) {
      await onTogglePromotion(product);
      onClose();
    }
  };

  const handleToggleOptionAvailability = async (selectionIndex: number, optionIndex: number) => {
    if (onToggleOptionAvailability) {
      await onToggleOptionAvailability(product, selectionIndex, optionIndex);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Detalhes do Produto</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Imagem do Produto */}
            <OptimizedImage 
              uri={product.image || null}
              defaultImage={defaultImage}
              style={styles.productImage} 
              borderRadius={0}
              lazy={false}
            />

            {/* Informações Básicas */}
            <View style={styles.infoSection}>
              <View style={styles.productHeader}>
                <Text style={styles.productName}>{product.name}</Text>
                {product.isPromotion && (
                  <View style={styles.promotionBadge}>
                    <Ionicons name="pricetag" size={14} color="#fff" />
                    <Text style={styles.promotionBadgeText}>PROMOÇÃO</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.productMeta}>
                <Text style={styles.productCategory}>Categoria: {product.category}</Text>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={16} color="#666" />
                  <Text style={styles.productUpdated}>
                    Atualizado em {product.updatedAt.toLocaleDateString('pt-BR')}
                  </Text>
                </View>
              </View>
              
              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>Preço</Text>
                <Text style={styles.productPrice}>{formatPrice(product.price)}</Text>
              </View>
            </View>

            {/* Seção de Ações */}
            <View style={styles.actionsSection}>
              <Text style={styles.actionsTitle}>Ações</Text>
              
              <View style={styles.actionGrid}>
                <View style={styles.actionCard}>
                  <View style={styles.actionCardHeader}>
                    <Ionicons name="toggle" size={20} color="#4CAF50" />
                    <Text style={styles.actionCardTitle}>Status</Text>
                  </View>
                  <View style={styles.actionCardContent}>
                    <Text style={styles.actionCardLabel}>
                      {product.isActive ? 'Produto ativo' : 'Produto inativo'}
                    </Text>
                    <Switch
                      value={product.isActive}
                      onValueChange={handleToggleAvailability}
                      trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
                      thumbColor={product.isActive ? '#fff' : '#f4f3f4'}
                      ios_backgroundColor="#E0E0E0"
                      style={styles.toggleSwitch}
                    />
                  </View>
                </View>

                {isPremium && onTogglePromotion && (
                  <TouchableOpacity 
                    style={styles.actionCard}
                    onPress={handleTogglePromotion}
                  >
                    <View style={styles.actionCardHeader}>
                      <MaterialIcons 
                        name={product.isPromotion ? "money-off" : "local-offer"} 
                        size={20} 
                        color={product.isPromotion ? "#FF6B6B" : "#FFA500"} 
                      />
                      <Text style={styles.actionCardTitle}>
                        {product.isPromotion ? "Promoção" : "Promoção"}
                      </Text>
                    </View>
                    <View style={styles.actionCardContent}>
                      <Text style={styles.actionCardLabel}>
                        {product.isPromotion ? "Remover promoção" : "Adicionar promoção"}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color="#999" />
                    </View>
                  </TouchableOpacity>
                )}

                <TouchableOpacity 
                  style={styles.actionCard}
                  onPress={handleEdit}
                >
                  <View style={styles.actionCardHeader}>
                    <Ionicons name="create-outline" size={20} color="#2196F3" />
                    <Text style={styles.actionCardTitle}>Editar</Text>
                  </View>
                  <View style={styles.actionCardContent}>
                    <Text style={styles.actionCardLabel}>Modificar produto</Text>
                    <Ionicons name="chevron-forward" size={16} color="#999" />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionCard}
                  onPress={handleDelete}
                >
                  <View style={styles.actionCardHeader}>
                    <Ionicons name="trash-outline" size={20} color="#F44336" />
                    <Text style={styles.actionCardTitle}>Excluir</Text>
                  </View>
                  <View style={styles.actionCardContent}>
                    <Text style={styles.actionCardLabel}>Remover produto</Text>
                    <Ionicons name="chevron-forward" size={16} color="#999" />
                  </View>
                </TouchableOpacity>
              </View>
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
                    <View style={styles.selectionHeader}>
                      <Text style={styles.variationName}>{variation.name}</Text>
                      {variation.minRequired && (
                        <Text style={styles.selectionRequirement}>
                          Seleção obrigatória
                        </Text>
                      )}
                    </View>
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
                      <View style={styles.selectionInfo}>
                        <Text style={styles.selectionRequirement}>
                          {selection.minRequired === selection.maxRequired 
                            ? `Escolha ${selection.minRequired}` 
                            : `Escolha de ${selection.minRequired} a ${selection.maxRequired}`}
                        </Text>
                        <Text style={styles.activeOptionsCount}>
                          {selection.options.filter(option => option.isActive !== false).length} de {selection.options.length} ativas
                        </Text>
                      </View>
                    </View>
                    {selection.options.map((option, optIndex) => (
                      <View key={optIndex} style={styles.optionItem}>
                        <View style={styles.optionInfo}>
                          <Text style={[
                            styles.optionName,
                            option.isActive === false && styles.optionNameInactive
                          ]}>
                            {option.name}
                          </Text>
                          {option.price !== undefined && option.price > 0 && (
                            <Text style={styles.optionPrice}>+{formatPrice(option.price)}</Text>
                          )}
                        </View>
                        <Switch
                          value={option.isActive !== false}
                          onValueChange={() => handleToggleOptionAvailability(index, optIndex)}
                          trackColor={{ false: '#767577', true: '#4CAF50' }}
                          thumbColor={(option.isActive !== false) ? '#fff' : '#f4f3f4'}
                          ios_backgroundColor="#767577"
                          style={styles.optionToggleSwitch}
                        />
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


          </ScrollView>
        </View>
      </SafeAreaView>


    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSpacer: {
    width: 40, // Adjust as needed to center the title
  },
  actionsSection: {
    padding: 24,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginHorizontal: 4,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    color: '#333',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  toggleSwitch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  optionToggleSwitch: {
    transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }],
  },
  scrollContent: {
    flex: 1,
  },
  productImage: {
    width: '100%',
    height: 280,
  },
  infoSection: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  promotionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  promotionBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  productMeta: {
    marginBottom: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  productUpdated: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  priceContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500',
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  productName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  productCategory: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  productPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFA500',
    marginBottom: 12,
  },
  productStatus: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  promotionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFA500',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
  },
  promotionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  section: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  variationItem: {
    marginBottom: 20,
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
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
    marginBottom: 4,
  },
  optionInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionName: {
    fontSize: 14,
    color: '#333',
  },
  optionNameInactive: {
    color: '#999',
    textDecorationLine: 'line-through',
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
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  selectionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 16,
  },
  selectionInfo: {
    alignItems: 'flex-end',
  },
  activeOptionsCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%', // Two cards per row
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  actionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  actionCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  actionCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingTop: 0,
  },
  actionCardLabel: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
}); 