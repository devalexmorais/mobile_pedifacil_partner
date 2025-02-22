import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RequiredSelection {
  name: string;
  minRequired: number;
  maxRequired: number;
  options: { name: string }[];
}

interface ProductRequiredSelectionsProps {
  selections: RequiredSelection[];
  onUpdate: (selections: RequiredSelection[]) => void;
}

export function ProductRequiredSelections({ selections, onUpdate }: ProductRequiredSelectionsProps) {
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
                <TouchableOpacity 
                  style={styles.removeButton}
                  onPress={() => {
                    const newSelections = [...selections];
                    newSelections[selectionIndex].options = 
                      newSelections[selectionIndex].options.filter((_, i) => i !== optionIndex);
                    onUpdate(newSelections);
                  }}
                >
                  <Ionicons name="close-circle" size={24} color="#FF3B30" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                value={option.name}
                onChangeText={(text) => {
                  const newSelections = [...selections];
                  newSelections[selectionIndex].options[optionIndex].name = text;
                  onUpdate(newSelections);
                }}
                placeholder="Nome da opção"
              />
            </View>
          ))}

          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => {
              const newSelections = [...selections];
              newSelections[selectionIndex].options.push({ name: '' });
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
}); 