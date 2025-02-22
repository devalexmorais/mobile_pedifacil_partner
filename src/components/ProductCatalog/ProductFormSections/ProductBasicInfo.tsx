import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import ImageViewer from '@/components/ImageViewer';
import { Ionicons } from '@expo/vector-icons';

interface CategoryOption {
  id: string;
  name: string;
}

interface NewProduct {
  name: string;
  description: string;
  price: string;
  category: string;
  image: string | null;
}

interface ProductBasicInfoProps {
  product: NewProduct;
  onUpdate: (updates: Partial<NewProduct>) => void;
  onPickImage: () => void;
  availableCategories: CategoryOption[];
  handleAddCategory: (name: string) => void;
  formatPrice: (price: string) => string;
}

export function ProductBasicInfo({ 
  product, 
  onUpdate,
  onPickImage,
  availableCategories,
  handleAddCategory,
  formatPrice
}: ProductBasicInfoProps) {
  const [showCategories, setShowCategories] = useState(false);

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
        value={product.name}
        onChangeText={(text) => onUpdate({ name: text })}
        placeholder="Nome do produto *"
      />

      <TextInput
        style={[styles.input, styles.textArea]}
        value={product.description}
        onChangeText={(text) => onUpdate({ description: text })}
        placeholder="Descrição"
        multiline
        numberOfLines={4}
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
      />

      <View style={styles.categoryInputContainer}>
        <TextInput
          style={[styles.input, styles.categoryInput]}
          value={product.category}
          onChangeText={(text) => onUpdate({ category: text })}
          placeholder="Categoria *"
        />
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowCategories(!showCategories)}
        >
          <Ionicons 
            name={showCategories ? "chevron-up" : "chevron-down"} 
            size={24} 
            color="#666" 
          />
        </TouchableOpacity>
        
        {showCategories && (
          <View style={styles.dropdown}>
            <ScrollView style={styles.dropdownScroll}>
              {availableCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.dropdownItem}
                  onPress={() => {
                    onUpdate({ category: category.name });
                    setShowCategories(false);
                  }}
                >
                  <Text style={styles.dropdownText}>{category.name}</Text>
                </TouchableOpacity>
              ))}
              {product.category && !availableCategories.some(cat => cat.name === product.category) && (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    handleAddCategory(product.category);
                    setShowCategories(false);
                  }}
                >
                  <Text style={styles.dropdownText}>Adicionar "{product.category}"</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        )}
      </View>
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
    width: 150,
    height: 150,
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
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryInputContainer: {
    position: 'relative',
    zIndex: 1,
    marginBottom: 16,
  },
  categoryInput: {
    flex: 1,
    marginBottom: 0,
    paddingRight: 30,
  },
  availableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  toggleButton: {
    padding: 4,
  },
  dropdownButton: {
    position: 'absolute',
    right: 8,
    top: 8,
    padding: 4,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    maxHeight: 200,
    zIndex: 2,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
}); 