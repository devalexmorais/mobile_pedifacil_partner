import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface Category {
  id: string;
  name: string;
}

interface CategoryListProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export function CategoryList({ 
  categories, 
  selectedCategory, 
  onSelectCategory 
}: CategoryListProps) {
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.categoriesScroll}
    >
      <TouchableOpacity
        style={[
          styles.categoryChip,
          !selectedCategory && styles.selectedCategoryChip
        ]}
        onPress={() => onSelectCategory(null)}
      >
        <Text style={[
          styles.categoryChipText,
          !selectedCategory && styles.selectedCategoryChipText
        ]}>Todos</Text>
      </TouchableOpacity>
      
      {categories.map(category => (
        <TouchableOpacity
          key={category.id}
          style={[
            styles.categoryChip,
            selectedCategory === category.id && styles.selectedCategoryChip
          ]}
          onPress={() => onSelectCategory(category.id)}
        >
          <Text style={[
            styles.categoryChipText,
            selectedCategory === category.id && styles.selectedCategoryChipText
          ]}>{category.name}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  categoriesScroll: {
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    height: 50,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
    paddingHorizontal: 10,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 3,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
  },
  selectedCategoryChip: {
    backgroundColor: '#FFA500',
    elevation: 2,
  },
  categoryChipText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '500',
  },
  selectedCategoryChipText: {
    color: '#fff',
  },
}); 