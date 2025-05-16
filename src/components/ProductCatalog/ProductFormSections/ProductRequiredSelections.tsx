import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RequiredSelection {
  name: string;
  minRequired: number;
  maxRequired: number;
  options: {
    name: string;
    price?: string;
    isActive?: boolean;
  }[];
}

interface ProductRequiredSelectionsProps {
  selections: RequiredSelection[];
  onUpdate: (selections: RequiredSelection[]) => void;
  formatPrice?: (value: string) => string;
}

export function ProductRequiredSelections({ 
  selections, 
  onUpdate,
  formatPrice = (value) => value
}: ProductRequiredSelectionsProps) {
  return (
    <View>
      <Text style={styles.sectionTitle}>Seleções Obrigatórias</Text>
      {selections.map((selection, selectionIndex) => (
        <View key={selectionIndex} style={styles.selectionContainer}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemTitle}>Seleção {selectionIndex + 1}</Text>
            <TouchableOpacity 
              style={styles.removeButton}
              onPress={() => {
                const newSelections = selections.filter((_, i) => i !== selectionIndex);
                onUpdate(newSelections);
              }}
            >
              <Ionicons name="close-circle" size={24} color="#FF3B30" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            value={selection.name}
            onChangeText={(text) => {
              const newSelections = [...selections];
              newSelections[selectionIndex].name = text;
              onUpdate(newSelections);
            }}
            placeholder="Nome da seleção"
          />

          <View style={styles.optionControlRow}>
            <View style={styles.optionControl}>
              <Text style={styles.label}>Mínimo de escolhas</Text>
              <View style={styles.maxChoicesContainer}>
                <TouchableOpacity 
                  style={styles.maxChoicesButton}
                  onPress={() => {
                    const newSelections = [...selections];
                    newSelections[selectionIndex].minRequired = 
                      Math.max(0, newSelections[selectionIndex].minRequired - 1);
                    onUpdate(newSelections);
                  }}
                >
                  <Ionicons name="remove" size={20} color="#666" />
                </TouchableOpacity>
                <Text style={styles.maxChoicesText}>{selection.minRequired}</Text>
                <TouchableOpacity 
                  style={styles.maxChoicesButton}
                  onPress={() => {
                    const newSelections = [...selections];
                    newSelections[selectionIndex].minRequired += 1;
                    onUpdate(newSelections);
                  }}
                >
                  <Ionicons name="add" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.optionControl}>
              <Text style={styles.label}>Máximo de escolhas</Text>
              <View style={styles.maxChoicesContainer}>
                <TouchableOpacity 
                  style={styles.maxChoicesButton}
                  onPress={() => {
                    const newSelections = [...selections];
                    newSelections[selectionIndex].maxRequired = 
                      Math.max(1, newSelections[selectionIndex].maxRequired - 1);
                    onUpdate(newSelections);
                  }}
                >
                  <Ionicons name="remove" size={20} color="#666" />
                </TouchableOpacity>
                <Text style={styles.maxChoicesText}>{selection.maxRequired}</Text>
                <TouchableOpacity 
                  style={styles.maxChoicesButton}
                  onPress={() => {
                    const newSelections = [...selections];
                    newSelections[selectionIndex].maxRequired += 1;
                    onUpdate(newSelections);
                  }}
                >
                  <Ionicons name="add" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {selection.options.map((option, optionIndex) => (
            <View key={optionIndex} style={styles.optionContainer}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>Opção {optionIndex + 1}</Text>
                <View style={styles.optionActions}>
                  <TouchableOpacity 
                    style={[styles.toggleButton, !option.isActive && styles.toggleButtonInactive]}
                    onPress={() => {
                      const newSelections = [...selections];
                      newSelections[selectionIndex].options[optionIndex].isActive = !option.isActive;
                      onUpdate(newSelections);
                    }}
                  >
                    <View style={styles.toggleButtonCircle} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.removeButton}
                    onPress={() => {
                      const newSelections = [...selections];
                      if (newSelections[selectionIndex].options.length <= 1) {
                        Alert.alert(
                          'Aviso',
                          'Não é possível remover a última opção de uma seleção obrigatória. Adicione outra opção primeiro ou remova a seleção inteira.'
                        );
                        return;
                      }
                      newSelections[selectionIndex].options = 
                        newSelections[selectionIndex].options.filter((_, i) => i !== optionIndex);
                      onUpdate(newSelections);
                    }}
                  >
                    <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </View>
              
              <TextInput
                style={[styles.input, !option.isActive && styles.inputInactive]}
                value={option.name}
                onChangeText={(text) => {
                  const newSelections = [...selections];
                  newSelections[selectionIndex].options[optionIndex].name = text;
                  onUpdate(newSelections);
                }}
                placeholder="Nome da opção"
                editable={option.isActive !== false}
              />
              
              <View style={styles.priceInputContainer}>
                <Text style={styles.priceLabel}>Preço adicional:</Text>
                <View style={styles.priceInputWrapper}>
                  <Text style={styles.currencySymbol}>R$</Text>
                  <TextInput
                    style={[styles.priceInput, !option.isActive && styles.inputInactive]}
                    value={option.price || '0,00'}
                    onChangeText={(text) => {
                      const newSelections = [...selections];
                      newSelections[selectionIndex].options[optionIndex].price = formatPrice(text);
                      onUpdate(newSelections);
                    }}
                    placeholder="0,00"
                    keyboardType="numeric"
                    editable={option.isActive !== false}
                  />
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => {
              const newSelections = [...selections];
              newSelections[selectionIndex].options.push({ 
                name: '',
                price: '0,00',
                isActive: true 
              });
              onUpdate(newSelections);
            }}
          >
            <Text style={styles.addButtonText}>+ Adicionar Opção</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => {
          onUpdate([...selections, {
            name: '',
            minRequired: 1,
            maxRequired: 1,
            options: []
          }]);
        }}
      >
        <Text style={styles.addButtonText}>+ Adicionar Seleção Obrigatória</Text>
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
  selectionContainer: {
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
    backgroundColor: '#fff',
  },
  optionControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  optionControl: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  maxChoicesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  maxChoicesButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
  },
  maxChoicesText: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 16,
    color: '#333',
  },
  optionContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  addButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  optionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleButton: {
    width: 40,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'flex-end',
    padding: 2,
  },
  toggleButtonInactive: {
    backgroundColor: '#ccc',
    alignItems: 'flex-start',
  },
  toggleButtonCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  inputInactive: {
    backgroundColor: '#f5f5f5',
    color: '#999',
  },
  priceInputContainer: {
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  priceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
}); 