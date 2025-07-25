import React from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Dropdown } from 'react-native-element-dropdown';
import { colors } from '@/styles/theme/colors';
import { OptionGroup } from '@/types/product-catalog';

interface OptionGroupFormProps {
  group: OptionGroup;
  onUpdate: (updatedGroup: OptionGroup) => void;
  onDelete: () => void;
}

export function OptionGroupForm({ group, onUpdate, onDelete }: OptionGroupFormProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.groupInput}
          placeholder="Nome do grupo"
          value={group.name}
          onChangeText={(text) => onUpdate({ ...group, name: text })}
        />
        <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={24} color="red" />
        </TouchableOpacity>
      </View>

      <View style={styles.typeContainer}>
        <Dropdown
          style={styles.dropdown}
          data={[
            { label: 'Extra', value: 'extra' },
            { label: 'Obrigatório', value: 'required' },
          ]}
          labelField="label"
          valueField="value"
          placeholder="Tipo do grupo"
          value={group.type}
          onChange={item => onUpdate({ ...group, type: item.value as 'extra' | 'required' })}
        />
      </View>

      {/* Resto do componente... */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.gray[200],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  groupInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
  },
  deleteButton: {
    padding: 8,
  },
  typeContainer: {
    marginBottom: 16,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    padding: 12,
  },
}); 