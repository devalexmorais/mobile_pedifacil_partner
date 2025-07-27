import React from 'react';
import { Modal,StyleSheet } from 'react-native';

interface DowngradeModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  onConfirm: () => void;
  selectedProducts: Set<string>;
  maxProducts: number;
  categories: Array<{
    id: string;
    name: string;
    products: Array<{
      id: string;
      name: string;
      price: number;
      isActive: boolean;
    }>;
  }>;
  onProductSelect: (productId: string) => void;
}

export function DowngradeModal({
  visible,
  onClose,
  onUpgrade,
  onConfirm,
  selectedProducts,
  maxProducts,
  categories,
  onProductSelect
}: DowngradeModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Conteúdo do modal */}
    </Modal>
  );
}

const styles = StyleSheet.create({
  // ... estilos
}); 