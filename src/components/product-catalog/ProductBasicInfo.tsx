import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { colors } from '@/styles/theme/colors';
import { Product } from '@/types/product-catalog';

interface ProductBasicInfoProps {
  product: Product | null;
  onChange: (field: keyof Product, value: string) => void;
}

export function ProductBasicInfo({ product, onChange }: ProductBasicInfoProps) {
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Nome do produto"
        value={product?.name}
        onChangeText={(text) => onChange('name', text)}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Descrição"
        value={product?.description}
        onChangeText={(text) => onChange('description', text)}
        multiline
      />
      
      <TextInput
        style={styles.input}
        placeholder="Preço"
        value={product?.price}
        onChangeText={(text) => onChange('price', text)}
        keyboardType="numeric"
      />
      
      <Dropdown
        style={styles.dropdown}
        data={[
          { label: 'Produto Simples', value: 'simple' },
          { label: 'Produto com Adicionais', value: 'additional' },
          { label: 'Combo', value: 'combo' },
        ]}
        labelField="label"
        valueField="value"
        placeholder="Tipo do produto"
        value={product?.productType}
        onChange={item => onChange('productType', item.value)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  input: {
    height: 52,
    borderColor: colors.gray[300],
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: colors.white,
  },
  dropdown: {
    height: 52,
    borderColor: colors.gray[300],
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
  },
}); 