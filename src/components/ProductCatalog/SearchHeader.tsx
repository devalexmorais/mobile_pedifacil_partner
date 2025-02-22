import React from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchHeaderProps {
  searchText: string;
  onSearchChange: (text: string) => void;
  onAddProduct: () => void;
  onManageProducts: () => void;
  showManageButton: boolean;
  isAddButtonDisabled: boolean;
}

export function SearchHeader({
  searchText,
  onSearchChange,
  onAddProduct,
  onManageProducts,
  showManageButton,
  isAddButtonDisabled
}: SearchHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar produtos..."
          value={searchText}
          onChangeText={onSearchChange}
        />
      </View>
      <View style={styles.headerButtons}>
        {showManageButton && (
          <TouchableOpacity 
            style={styles.manageButton}
            onPress={onManageProducts}
          >
            <Ionicons name="list" size={20} color="#FFF" />
            <Text style={styles.manageButtonText}>Gerenciar Ativos</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={[
            styles.addButton,
            isAddButtonDisabled && styles.addButtonDisabled
          ]}
          onPress={onAddProduct}
        >
          <Ionicons 
            name="add" 
            size={24} 
            color={isAddButtonDisabled ? '#999' : '#FFF'} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 25,
    paddingHorizontal: 15,
    marginRight: 10,
    height: 40,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    marginLeft: 8,
    fontSize: 15,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  manageButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#FFA500',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
}); 