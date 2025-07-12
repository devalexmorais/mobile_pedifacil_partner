import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PromotionModalProps } from '@/types/promotion-modal';

interface Promotion {
  id: string;
  productId: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  finalPrice: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  isPromotion?: boolean;
  promotion?: Promotion;
}

export function PromotionModal({ visible, onClose, onSave, product }: PromotionModalProps) {
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');

  const formatPrice = (value: string): string => {
    // Remove tudo que não é número
    let numbers = value.replace(/\D/g, '');
    
    // Se não houver números, retorna "0,00"
    if (!numbers) return "0,00";
    
    // Converte para número
    const price = Number(numbers);
    
    // Formata o número com duas casas decimais, usando vírgula como separador
    return price.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true
    }).replace(/\s/g, '');
  };

  const unformatPrice = (value: string): string => {
    return value.replace(/\D/g, '');
  };

  const handleDiscountChange = (value: string) => {
    if (discountType === 'fixed') {
      // Remove todos os caracteres não numéricos
      const numbers = value.replace(/\D/g, '');
      // Converte para número e divide por 100 para ter os centavos
      const numericValue = Number(numbers) / 100;
      // Formata o valor
      setDiscountValue(numericValue.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: true
      }).replace(/\s/g, ''));
    } else {
      // Para porcentagem, permite apenas números
      const numbers = value.replace(/\D/g, '');
      setDiscountValue(numbers);
    }
  };

  const calculatePromotionalPrice = (): string => {
    if (!product?.price || !discountValue) return 'R$ 0,00';

    const originalPrice = product.price;
    let finalPrice: number;

    if (discountType === 'fixed') {
      const discount = Number(discountValue.replace(/\D/g, '')) / 100;
      finalPrice = originalPrice - discount;
    } else {
      const percentageDiscount = Number(discountValue);
      finalPrice = originalPrice * (1 - percentageDiscount / 100);
    }

    return `R$ ${finalPrice.toFixed(2).replace('.', ',')}`;
  };

  const handleSave = () => {
    if (!product || !discountValue) return;

    let finalDiscountValue: number;
    let finalPrice: number;

    if (discountType === 'fixed') {
      finalDiscountValue = Number(discountValue.replace(/\D/g, '')) / 100;
      finalPrice = product.price - finalDiscountValue;
    } else {
      finalDiscountValue = Number(discountValue);
      finalPrice = product.price * (1 - finalDiscountValue / 100);
    }

    const promotion: Promotion = {
      id: Date.now().toString(),
      productId: product.id,
      discountType,
      discountValue: finalDiscountValue,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true,
      finalPrice: Number(finalPrice.toFixed(2))
    };

    onSave(promotion);
    setDiscountValue('');
    setDiscountType('percentage');
    onClose();
  };

  const handleClose = () => {
    setDiscountValue('');
    setDiscountType('percentage');
    onClose();
  };

  if (!product) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Adicionar Promoção</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.originalPrice}>
            Preço original: R$ {product.price.toFixed(2)}
          </Text>

          <View style={styles.discountTypeContainer}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                discountType === 'percentage' && styles.selectedType
              ]}
              onPress={() => {
                setDiscountType('percentage');
                setDiscountValue('');
              }}
            >
              <Text style={[
                styles.typeText,
                discountType === 'percentage' && styles.selectedTypeText
              ]}>Porcentagem</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                discountType === 'fixed' && styles.selectedType
              ]}
              onPress={() => {
                setDiscountType('fixed');
                setDiscountValue('');
              }}
            >
              <Text style={[
                styles.typeText,
                discountType === 'fixed' && styles.selectedTypeText
              ]}>Valor Fixo</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>
            {discountType === 'percentage' ? 'Desconto (%)' : 'Valor do Desconto'}
          </Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={discountValue}
            onChangeText={handleDiscountChange}
            placeholder={discountType === 'percentage' ? "Ex: 10" : "R$ 0,00"}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>Preço promocional:</Text>
            <Text style={styles.previewPrice}>
              {calculatePromotionalPrice()}
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Salvar Promoção</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  originalPrice: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  discountTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  selectedType: {
    backgroundColor: '#FFA500',
    borderColor: '#FFA500',
  },
  typeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  selectedTypeText: {
    color: '#fff',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 24,
  },
  previewContainer: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  previewLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  previewPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFA500',
  },
  saveButton: {
    backgroundColor: '#FFA500',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 