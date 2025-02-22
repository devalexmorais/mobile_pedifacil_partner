import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Extra {
  name: string;
  extraPrice: number;
  minRequired: number;
  maxRequired: number;
}

interface ProductExtrasProps {
  extras: Extra[];
  onAddExtra: () => void;
  onRemoveExtra: (index: number) => void;
  onUpdateExtra: (index: number, updatedExtra: Extra) => void;
}

export function ProductExtras({ 
  extras, 
  onAddExtra, 
  onRemoveExtra, 
  onUpdateExtra 
}: ProductExtrasProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Opções Adicionais</Text>

      {extras.map((extra, index) => (
        <View key={index} style={styles.extraContainer}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemTitle}>Adicional {index + 1}</Text>
            <TouchableOpacity 
              onPress={() => onRemoveExtra(index)}
              style={styles.removeButton}
            >
              <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Nome do adicional"
            value={extra.name}
            onChangeText={(text) => {
              onUpdateExtra(index, { ...extra, name: text });
            }}
          />

          <TextInput
            style={styles.input}
            placeholder="Preço adicional"
            value={extra.extraPrice?.toString()}
            keyboardType="numeric"
            onChangeText={(text) => {
              onUpdateExtra(index, { ...extra, extraPrice: Number(text) || 0 });
            }}
          />

          <View style={styles.optionControlRow}>
            <View style={styles.optionControl}>
              <Text style={styles.label}>Mínimo</Text>
              <View style={styles.maxChoicesContainer}>
                <TouchableOpacity
                  style={styles.maxChoicesButton}
                  onPress={() => {
                    onUpdateExtra(index, {
                      ...extra,
                      minRequired: Math.max(0, extra.minRequired - 1)
                    });
                  }}
                >
                  <Ionicons name="remove" size={20} color="#666" />
                </TouchableOpacity>
                <Text style={styles.maxChoicesText}>{extra.minRequired}</Text>
                <TouchableOpacity
                  style={styles.maxChoicesButton}
                  onPress={() => {
                    onUpdateExtra(index, {
                      ...extra,
                      minRequired: extra.minRequired + 1
                    });
                  }}
                >
                  <Ionicons name="add" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.optionControl}>
              <Text style={styles.label}>Máximo</Text>
              <View style={styles.maxChoicesContainer}>
                <TouchableOpacity
                  style={styles.maxChoicesButton}
                  onPress={() => {
                    onUpdateExtra(index, {
                      ...extra,
                      maxRequired: Math.max(1, extra.maxRequired - 1)
                    });
                  }}
                >
                  <Ionicons name="remove" size={20} color="#666" />
                </TouchableOpacity>
                <Text style={styles.maxChoicesText}>{extra.maxRequired}</Text>
                <TouchableOpacity
                  style={styles.maxChoicesButton}
                  onPress={() => {
                    onUpdateExtra(index, {
                      ...extra,
                      maxRequired: extra.maxRequired + 1
                    });
                  }}
                >
                  <Ionicons name="add" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      ))}

      <TouchableOpacity onPress={onAddExtra} style={styles.addButton}>
        <Text style={styles.addButtonText}>Adicionar Opção Adicional</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
    color: '#333',
  },
  extraContainer: {
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
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  optionControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
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
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 4,
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