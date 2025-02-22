import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FormVariation {
  name: string;
  description: string;
  price: string;
  isAvailable: boolean;
}

interface ProductVariationsProps {
  variations: FormVariation[];
  onUpdate: (variations: FormVariation[]) => void;
}

export function ProductVariations({ variations, onUpdate }: ProductVariationsProps) {
  const addVariation = () => {
    onUpdate([...variations, {
      name: '',
      description: '',
      price: '',
      isAvailable: true
    }]);
  };

  const removeVariation = (index: number) => {
    onUpdate(variations.filter((_, i) => i !== index));
  };

  return (
    <View>
      <Text style={styles.sectionTitle}>Variações</Text>
      {variations.map((variation, index) => (
        <View key={index} style={styles.variationContainer}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemTitle}>Variação {index + 1}</Text>
            <TouchableOpacity 
              style={styles.removeButton}
              onPress={() => removeVariation(index)}
            >
              <Ionicons name="close-circle" size={24} color="#FF3B30" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            value={variation.name}
            onChangeText={(text) => {
              const newVariations = [...variations];
              newVariations[index].name = text;
              onUpdate(newVariations);
            }}
            placeholder="Nome da variação"
          />
          <TextInput
            style={styles.input}
            value={variation.description}
            onChangeText={(text) => {
              const newVariations = [...variations];
              newVariations[index].description = text;
              onUpdate(newVariations);
            }}
            placeholder="Descrição"
          />
          <TextInput
            style={styles.input}
            value={variation.price}
            onChangeText={(text) => {
              const newVariations = [...variations];
              newVariations[index].price = text;
              onUpdate(newVariations);
            }}
            placeholder="Preço"
            keyboardType="numeric"
          />
        </View>
      ))}
      <TouchableOpacity style={styles.addButton} onPress={addVariation}>
        <Text style={styles.addButtonText}>+ Adicionar Variação</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
    color: '#333',
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
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
}); 