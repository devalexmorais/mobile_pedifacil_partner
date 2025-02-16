import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/styles/theme/colors';
import { ProductWithPromotion, Promotion } from '@/types/product-catalog';

interface PromotionModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (promotion: Promotion) => void;
  product: ProductWithPromotion | null;
}

export function PromotionModal({ visible, onClose, onSave, product }: PromotionModalProps) {
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');

  const formatToBRL = (value: string): string => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Converte para centavos
    const cents = parseInt(numbers, 10);
    if (isNaN(cents)) return '';
    
    // Formata para reais
    const reais = (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    return reais;
  };

  const unformatBRL = (value: string): number => {
    const numbers = value.replace(/\D/g, '');
    return parseInt(numbers, 10) / 100;
  };

  const handleDiscountChange = (value: string) => {
    if (discountType === 'fixed') {
      setDiscountValue(formatToBRL(value));
    } else {
      // Para porcentagem, permite apenas números
      const numbers = value.replace(/\D/g, '');
      setDiscountValue(numbers);
    }
  };

  const calculatePromotionalPrice = (): string => {
    if (!product?.price || !discountValue) return 'R$ 0,00';

    const originalPrice = unformatBRL(product.price);
    const discount = discountType === 'fixed' 
      ? unformatBRL(discountValue)
      : parseFloat(discountValue);

    if (discountType === 'percentage') {
      const discountAmount = originalPrice * (discount / 100);
      return formatToBRL(((originalPrice - discountAmount) * 100).toString());
    } else {
      return formatToBRL(((originalPrice - discount) * 100).toString());
    }
  };

  const handleSave = () => {
    if (!product || !discountValue) return;

    const promotion: Promotion = {
      id: Date.now().toString(),
      productId: product.id,
      discountType,
      discountValue: discountType === 'fixed' 
        ? unformatBRL(discountValue)
        : parseFloat(discountValue),
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true,
    };

    onSave(promotion);
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
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Adicionar Promoção</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.gray[600]} />
            </TouchableOpacity>
          </View>

          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.originalPrice}>Preço original: {product.price}</Text>

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
    backgroundColor: colors.white,
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
    color: colors.gray[800],
  },
  closeButton: {
    padding: 4,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: 8,
  },
  originalPrice: {
    fontSize: 16,
    color: colors.gray[600],
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
    borderColor: colors.gray[300],
    alignItems: 'center',
  },
  selectedType: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray[600],
  },
  selectedTypeText: {
    color: colors.white,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray[700],
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 24,
  },
  previewContainer: {
    backgroundColor: colors.gray[100],
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  previewLabel: {
    fontSize: 14,
    color: colors.gray[600],
    marginBottom: 4,
  },
  previewPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.orange,
  },
  saveButton: {
    backgroundColor: colors.orange,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
}); 