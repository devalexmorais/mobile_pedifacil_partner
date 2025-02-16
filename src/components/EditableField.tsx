import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EditableFieldProps {
  label: string;
  value: string;
  onSave?: (newValue: string) => Promise<void>;
  editable?: boolean;
}

export function EditableField({ 
  label, 
  value, 
  onSave = async () => {}, 
  editable = true 
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  const handleSave = async () => {
    try {
      await onSave(tempValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  };

  if (!editable) {
    return (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}:</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    );
  }

  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}:</Text>
      {isEditing ? (
        <View style={styles.editContainer}>
          <TextInput
            style={styles.input}
            value={tempValue}
            onChangeText={setTempValue}
            autoFocus
          />
          <TouchableOpacity onPress={handleSave} style={styles.iconButton}>
            <Ionicons name="checkmark" size={20} color="#4CAF50" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.iconButton}>
            <Ionicons name="close" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.valueContainer}>
          <Text style={styles.infoValue}>{value}</Text>
          <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.iconButton}>
            <Ionicons name="pencil" size={18} color="#FFA500" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  infoLabel: {
    width: 100,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  editContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#FFA500',
    paddingVertical: 4,
  },
  iconButton: {
    padding: 4,
    marginLeft: 8,
  },
}); 