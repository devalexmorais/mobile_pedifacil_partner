import React, { useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Text, Modal, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProductBasicInfo } from './ProductFormSections/ProductBasicInfo';
import { ProductVariations } from './ProductFormSections/ProductVariations';
import { ProductRequiredSelections } from './ProductFormSections/ProductRequiredSelections';
import { ProductExtras } from './ProductFormSections/ProductExtras';
import { Product } from '@/types/product';

interface NewProduct {
  name: string;
  description: string;
  price: string;
  category: string;
  categoryId: string;
  isActive: boolean;
  isPromotion: boolean;
  promotionalPrice: string | null;
  variations: FormVariation[];
  requiredSelections: RequiredSelection[];
  extras: Extra[];
  image: string | null;
}

interface FormVariation {
  name: string;
  price: string;
  isAvailable: boolean;
  minRequired?: number;
}

interface RequiredSelection {
  name: string;
  minRequired: number;
  maxRequired: number;
  options: {
    name: string;
    price?: string;
    isActive?: boolean;
  }[];
}

interface Extra {
  name: string;
  extraPrice: number;
  minRequired: number;
  maxRequired: number;
}

interface ProductFormModalProps {
  visible: boolean;
  isEditing: boolean;
  newProduct: NewProduct;
  editingProduct?: Product;
  onClose: () => void;
  onSave: () => void;
  onUpdateProduct: (updates: Partial<NewProduct>) => void;
  onPickImage: () => void;
  formatPrice: (value: string) => string;
  unformatPrice: (value: string) => string;
  addVariation: () => void;
  removeVariation: (index: number) => void;
  addRequiredSelection: () => void;
  removeRequiredSelection: (index: number) => void;
  addOptionToSelection: (selectionIndex: number) => void;
  removeOptionFromSelection: (selectionIndex: number, optionIndex: number) => void;
  addExtra: () => void;
  removeExtra: (index: number) => void;
}

export function ProductFormModal({
  visible,
  isEditing,
  newProduct,
  editingProduct,
  onClose,
  onSave,
  onUpdateProduct,
  onPickImage,
  formatPrice,
  unformatPrice,
  addVariation,
  removeVariation,
  addRequiredSelection,
  removeRequiredSelection,
  addOptionToSelection,
  removeOptionFromSelection,
  addExtra,
  removeExtra,
  ...props
}: ProductFormModalProps) {
  useEffect(() => {
    if (isEditing && editingProduct) {
      if (newProduct.name === editingProduct.name) {
        return;
      }
      
      const formVariations: FormVariation[] = (editingProduct.variations || []).map(variation => ({
        name: variation.name,
        price: formatPrice(((variation.options?.[0]?.price ?? 0) * 100).toString()),
        isAvailable: true
      }));

      onUpdateProduct({
        name: editingProduct.name,
        description: editingProduct.description || '',
        price: formatPrice((editingProduct.price * 100).toString()),
        category: editingProduct.category,
        categoryId: editingProduct.categoryId || '',
        isActive: editingProduct.isActive,
        isPromotion: editingProduct.isPromotion || false,
        promotionalPrice: null,
        variations: formVariations,
        requiredSelections: editingProduct.requiredSelections.map(selection => ({
          name: selection.name,
          minRequired: selection.minRequired,
          maxRequired: selection.maxRequired,
          options: selection.options.map(option => ({
            name: option.name,
            isActive: option.isActive !== false
          }))
        })) || [],
        extras: editingProduct.extras || [],
        image: editingProduct.image || null
      });
    }
  }, [isEditing, editingProduct]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalOverlay}>
        <KeyboardAvoidingView 
          style={styles.modalContent}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {isEditing ? 'Editar Produto' : 'Novo Produto'}
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView 
            style={styles.modalForm}
            contentContainerStyle={styles.modalFormContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <ProductBasicInfo 
              product={newProduct}
              onUpdate={onUpdateProduct}
              onPickImage={onPickImage}
              formatPrice={formatPrice}
            />

            <ProductVariations 
              variations={newProduct.variations}
              onUpdate={(variations) => onUpdateProduct({ variations })}
              formatPrice={formatPrice}
              basePrice={newProduct.price}
              {...props}
            />

            <ProductRequiredSelections 
              selections={newProduct.requiredSelections}
              onUpdate={(requiredSelections) => onUpdateProduct({ requiredSelections })}
              formatPrice={formatPrice}
              {...props}
            />

            <ProductExtras
              extras={newProduct.extras}
              onAddExtra={addExtra}
              onRemoveExtra={removeExtra}
              onUpdateExtra={(index, updatedExtra) => {
                const updatedExtras = [...newProduct.extras];
                updatedExtras[index] = updatedExtra;
                onUpdateProduct({ extras: updatedExtras });
              }}
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.footerButton, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.footerButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerButton, styles.createButton]}
              onPress={onSave}
            >
              <Text style={[styles.footerButtonText, styles.createButtonText]}>
                {isEditing ? 'Atualizar Produto' : 'Criar Produto'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Platform.OS === 'ios' ? 20 : 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: Platform.OS === 'ios' ? 8 : 4,
    marginRight: Platform.OS === 'ios' ? 12 : 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: Platform.OS === 'ios' ? 18 : 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: Platform.OS === 'ios' ? 44 : 40, // Para manter o título centralizado
  },
  modalForm: {
    flex: 1,
    padding: Platform.OS === 'ios' ? 20 : 16,
  },
  modalFormContent: {
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: Platform.OS === 'ios' ? 20 : 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16, // Adiciona padding extra para iPhone
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: Platform.OS === 'ios' ? 16 : 12,
  },
  footerButton: {
    flex: 1,
    padding: Platform.OS === 'ios' ? 16 : 14,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: Platform.OS === 'ios' ? 50 : 44,
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  createButton: {
    backgroundColor: '#FFA500',
  },
  footerButtonText: {
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    fontWeight: '600',
    color: '#666',
  },
  createButtonText: {
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  availableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  toggleButton: {
    padding: 4,
  },
  variationContainer: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  removeButton: {
    padding: 4,
  },
  addButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  addButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  imagePickerButton: {
    width: 150,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  uploadProgress: {
    marginTop: 8,
  },
  categoryInputContainer: {
    position: 'relative',
    zIndex: 1,
    marginBottom: 16,
  },
  categoryInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  categoryInput: {
    flex: 1,
    marginBottom: 0,
    borderWidth: 0,
    paddingRight: 30,
  },
  categoryDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    maxHeight: 200,
    zIndex: 2,
    elevation: 3,
    marginTop: 4,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryIcon: {
    marginRight: 8,
  },
  categoryOptionText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  newCategoryOption: {
    backgroundColor: '#fff',
    borderBottomWidth: 0,
  },
  newCategoryText: {
    color: '#FFA500',
    fontWeight: '500',
    fontSize: 15,
    flex: 1,
  },
  optionControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  optionControl: {
    flex: 1,
    alignItems: 'center',
  },
  maxChoicesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f9',
    borderRadius: 8,
    padding: 4,
  },
  maxChoicesButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  maxChoicesText: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 16,
    color: '#333',
  },
}); 