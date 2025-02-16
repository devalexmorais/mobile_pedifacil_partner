import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/styles/theme/colors';

interface HeaderProps {
  onAddProduct: () => void;
  onBackPress: () => void;
}

export function Header({ onAddProduct, onBackPress }: HeaderProps) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={colors.gray[800]} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Cardápio</Text>
      <TouchableOpacity onPress={onAddProduct} style={styles.addButton}>
        <Ionicons name="add" size={20} color={colors.white} />
        <Text style={styles.addButtonText}>Novo Produto</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 3,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[800],
    marginLeft: 16,
    marginRight: 16,
  },
  addButton: {
    backgroundColor: colors.orange,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: colors.orange,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 3,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
}); 