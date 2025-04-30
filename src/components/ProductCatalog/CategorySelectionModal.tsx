import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { categoryService } from '../../services/categoryService';

interface Category {
  id: string;
  name: string;
}

interface CategorySelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectCategory: (category: Category) => void;
  selectedCategoryId?: string;
}

export function CategorySelectionModal({
  visible,
  onClose,
  onSelectCategory,
  selectedCategoryId,
}: CategorySelectionModalProps) {
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loading, setLoading] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (visible) {
      loadCategories();
    }
  }, [visible]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      
      // Carregar apenas categorias personalizadas do parceiro
      const partnerCategories = await categoryService.getPartnerCategories();
      setCustomCategories(partnerCategories);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      Alert.alert('Erro', 'Não foi possível carregar as categorias. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Erro', 'Digite um nome para a categoria');
      return;
    }

    try {
      setCreatingCategory(true);
      
      // Verifica se a categoria já existe
      const existingCategory = customCategories.find(
        cat => cat.name.toLowerCase() === newCategoryName.toLowerCase()
      );
      
      if (existingCategory) {
        // Se a categoria já existe, apenas seleciona ela
        onSelectCategory(existingCategory);
        onClose();
        return;
      }
      
      // Cria a nova categoria
      const trimmedName = newCategoryName.trim();
      const formattedName = trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1);
      const newCategory = await categoryService.createPartnerCategory(formattedName);
      console.log('Nova categoria criada:', newCategory);
      
      // Adiciona à lista de categorias personalizadas
      setCustomCategories(prev => [...prev, newCategory]);
      
      // Limpa o campo de texto
      setNewCategoryName('');
      
      // Seleciona automaticamente a nova categoria
      onSelectCategory(newCategory);
      onClose();
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      Alert.alert('Erro', 'Não foi possível criar a categoria. Tente novamente.');
    } finally {
      setCreatingCategory(false);
    }
  };

  // Função para excluir categoria personalizada
  const handleDeleteCategory = (category: Category) => {
    Alert.alert(
      'Excluir categoria',
      `Tem certeza que deseja excluir a categoria "${category.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: async () => {
            try {
              await categoryService.deletePartnerCategory(category.id);
              setCustomCategories(prev => prev.filter(c => c.id !== category.id));
            } catch (error) {
              console.error('Erro ao excluir categoria:', error);
              Alert.alert('Erro', 'Não foi possível excluir a categoria');
            }
        }}
      ]
    );
  };

  const filteredCustomCategories = customCategories.filter(category => 
    category.name.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Selecionar Categoria</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar categoria..."
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

          <View style={styles.createContainer}>
            <TextInput
              style={styles.createInput}
              placeholder="Criar nova categoria..."
              value={newCategoryName}
              onChangeText={(text) => {
                const formattedText = text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
                setNewCategoryName(formattedText);
              }}
            />
            <TouchableOpacity
              style={[styles.createButton, !newCategoryName.trim() && styles.createButtonDisabled]}
              onPress={handleCreateCategory}
              disabled={!newCategoryName.trim() || creatingCategory}
            >
              {creatingCategory ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.createButtonText}>Criar</Text>
              )}
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator style={styles.loader} size="large" color="#FFA500" />
          ) : (
            <ScrollView style={styles.list}>
              {filteredCustomCategories.length > 0 ? (
                filteredCustomCategories.map((category) => (
                  <View
                    key={category.id}
                    style={[
                      styles.categoryItem,
                      selectedCategoryId === category.id && styles.selectedCategory,
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.categoryNameContainer}
                      onPress={() => {
                        onSelectCategory(category);
                        onClose();
                      }}
                    >
                      <Ionicons
                        name="folder"
                        size={22}
                        color={selectedCategoryId === category.id ? "#FFA500" : "#666"}
                        style={styles.categoryIcon}
                      />
                      <Text style={styles.categoryName}>{category.name}</Text>
                      {selectedCategoryId === category.id && (
                        <Ionicons name="checkmark-circle" size={22} color="#FFA500" />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteCategory(category)}
                    >
                      <Ionicons name="trash" size={22} color="#E53935" />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={styles.noResults}>
                  Nenhuma categoria encontrada. Crie uma nova ou tente outra busca.
                </Text>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '95%',
    height: '90%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    marginBottom: 20,
    paddingHorizontal: 12,
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 46,
    fontSize: 16,
  },
  createContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  createInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginRight: 12,
    fontSize: 16,
  },
  createButton: {
    backgroundColor: '#FFA500',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    height: 50,
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  list: {
    flex: 1,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    borderRadius: 10,
    marginBottom: 6,
  },
  selectedCategory: {
    backgroundColor: '#fff9ec',
    borderWidth: 1,
    borderColor: '#FFA500',
  },
  categoryNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    marginRight: 10,
  },
  categoryName: {
    fontSize: 17,
    color: '#333',
  },
  loader: {
    marginTop: 50,
  },
  noResults: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#666',
  },
}); 