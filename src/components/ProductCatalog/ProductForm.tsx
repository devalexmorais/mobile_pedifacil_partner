import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

interface ProductFormProps {
  // ... definir as props necessárias
}

export function ProductForm({
  // ... props
}: ProductFormProps) {
  return (
    <ScrollView style={styles.modalForm}>
      {/* Conteúdo do formulário */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  modalForm: {
    flex: 1,
    padding: 16,
  },
}); 