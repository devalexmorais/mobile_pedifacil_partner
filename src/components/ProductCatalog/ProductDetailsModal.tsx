import React from 'react';
import { View, Modal, ScrollView, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      {/* ... conteúdo do modal de detalhes */}
    </Modal>
  );
}

const styles = StyleSheet.create({
  // ... estilos
}); 