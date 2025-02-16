import React from 'react';
import { Modal, ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/styles/theme/colors';
import { Product } from '@/types/product-catalog';
import { ProductBasicInfo } from './ProductBasicInfo';
import { OptionGroupForm } from './OptionGroupForm';
import { ImageSection } from './ImageSection';

interface ProductFormModalProps {
  visible: boolean;
  onClose: () => void;
  product: Product | null;
  onSave: (product: Product) => void;
  isEditing?: boolean;
}

export function ProductFormModal({
  visible,
  onClose,
  product,
  onSave,
  isEditing = false,
}: ProductFormModalProps) {
  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <ScrollView style={styles.modalScrollView}>
        <View style={styles.modalContent}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.gray[600]} />
          </TouchableOpacity>
          
          <Text style={styles.modalTitle}>
            {isEditing ? 'Editar Produto' : 'Adicionar Novo Produto'}
          </Text>

          {/* Componentes do formulário */}
          <ProductBasicInfo product={product} onChange={() => {}} />
          <ImageSection image={product?.image} onImagePick={() => {}} />
          
          {/* Botões de ação */}
          <TouchableOpacity onPress={() => onSave(product!)} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Salvar Produto</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalScrollView: {
    flex: 1,
    backgroundColor: colors.white,
  },
  modalContent: {
    padding: 24,
    paddingTop: 70,
  },
  closeButton: {
    position: 'absolute',
    top: 24,
    right: 24,
    padding: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.gray[800],
    marginBottom: 24,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: colors.orange,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
}); 