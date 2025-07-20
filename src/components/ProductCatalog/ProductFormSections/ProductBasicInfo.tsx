import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import ImageViewer from '@/components/ImageViewer';
import { Ionicons } from '@expo/vector-icons';
import { CategorySelectionModal } from '../CategorySelectionModal';

interface CategoryOption {
  id: string;
  name: string;
}

interface NewProduct {
  name: string;
  description: string;
  price: string;
  category: string;
  categoryId: string;
  image: string | null;
}

interface ProductBasicInfoProps {
  product: NewProduct;
  onUpdate: (updates: Partial<NewProduct>) => void;
  onPickImage: () => void;
  formatPrice: (price: string) => string;
}

export function ProductBasicInfo({ 
  product, 
  onUpdate,
  onPickImage,
  formatPrice
}: ProductBasicInfoProps) {
  const [nameInput, setNameInput] = useState(product.name);
  React.useEffect(() => {
    setNameInput(product.name);
  }, [product.name]);

  const [modalVisible, setModalVisible] = useState(false);

  const handleCategorySelect = (category: CategoryOption) => {
    onUpdate({ 
      category: category.name,
      categoryId: category.id
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.imageSection}>
        <TouchableOpacity 
          style={styles.imagePickerButton} 
          onPress={onPickImage}
        >
          <ImageViewer
            placeholderImageSource={require('@/assets/localhost-file-not-found.jpg')}
            selectedImage={product.image}
          />
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        value={nameInput}
        onChangeText={(text) => {
          const smallWords = ['de', 'do', 'da', 'dos', 'das', 'e'];
          let wordIndex = 0;
          const formatted = text
            .split(/(\s+)/)
            .map(part => {
              if (/\s+/.test(part)) return part;
              const lower = part.toLowerCase();
              const idx = wordIndex++;
              if (idx > 0 && smallWords.includes(lower)) {
                return lower;
              }
              return lower.charAt(0).toUpperCase() + lower.slice(1);
            })
            .join('');
          setNameInput(formatted);
          onUpdate({ name: formatted });
        }}
        placeholder="Nome do produto *"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TextInput
        style={[styles.input, styles.textArea]}
        value={product.description}
        onChangeText={(text) => {
          const formattedText = text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
          onUpdate({ description: formattedText });
        }}
        placeholder="Descrição"
        multiline
        numberOfLines={4}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TextInput
        style={styles.input}
        value={product.price}
        onChangeText={(text) => {
          const formattedPrice = formatPrice(text);
          onUpdate({ price: formattedPrice });
        }}
        placeholder="Preço *"
        keyboardType="numeric"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TouchableOpacity 
        style={styles.categoryButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.categoryButtonLabel}>Categoria *</Text>
        <View style={styles.categoryInputContainer}>
          <Text style={[styles.categoryValue, !product.category && styles.placeholder]}>
            {product.category || 'Selecione uma categoria'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#666" />
        </View>
      </TouchableOpacity>

      <CategorySelectionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelectCategory={handleCategorySelect}
        selectedCategoryId={product.categoryId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  imagePickerButton: {
    width: Platform.OS === 'ios' ? 120 : 150,
    height: Platform.OS === 'ios' ? 120 : 150,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: Platform.OS === 'ios' ? 16 : 12,
    marginBottom: 16,
    fontSize: 16,
    minHeight: Platform.OS === 'ios' ? 48 : 44,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: Platform.OS === 'ios' ? 16 : 12,
  },
  categoryButton: {
    marginBottom: 16,
  },
  categoryButtonLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  categoryInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: Platform.OS === 'ios' ? 16 : 12,
    backgroundColor: '#fff',
    minHeight: Platform.OS === 'ios' ? 48 : 44,
  },
  categoryValue: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  placeholder: {
    color: '#999',
  },
}); 