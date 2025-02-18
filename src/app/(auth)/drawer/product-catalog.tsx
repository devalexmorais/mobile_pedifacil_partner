import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, collection, getDocs, addDoc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../../../config/firebase';
import * as ImagePicker from 'expo-image-picker';
import ImageViewer from '../../../components/ImageViewer';

interface ProductOption {
  name: string;
  extraPrice: number;
}

interface ProductVariation {
  name: string;
  options: ProductOption[];
}

interface RequiredSelection {
  name: string;
  minRequired: number;
  maxRequired: number;
  options: ProductOption[];
}

interface Extra {
  name: string;
  extraPrice: number;
  minRequired: number;
  maxRequired: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  isActive: boolean;
  isPromotion: boolean;
  createdAt: Date;
  updatedAt: Date;
  sellerId: string;
  variations: ProductVariation[];
  requiredSelections: RequiredSelection[];
  extras: Extra[];
}

interface Category {
  id: string;
  name: string;
  products: Product[];
}

interface FormVariation {
  name: string;
  description: string;
  price: string;
  isAvailable: boolean;
}

interface NewProduct {
  name: string;
  description: string;
  price: string;
  category: string;
  isActive: boolean;
  isPromotion: boolean;
  promotionalPrice: string | null;
  variations: FormVariation[];
  requiredSelections: RequiredSelection[];
  extras: Extra[];
  image: string | null;
}

interface CategoryOption {
  id: string;
  name: string;
}

export default function ProductCatalog() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState<NewProduct>({
    name: '',
    description: '',
    price: '',
    category: '',
    isActive: true,
    isPromotion: false,
    promotionalPrice: null,
    variations: [],
    requiredSelections: [],
    extras: [],
    image: null
  });
  const [availableCategories, setAvailableCategories] = useState<CategoryOption[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productVariations, setProductVariations] = useState<ProductVariation[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadProducts = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const productsRef = collection(db, 'partners', user.uid, 'products');
      const productsSnapshot = await getDocs(productsRef);
      
      const productsData = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as Product[];

      // Agrupar produtos por categoria
      const groupedProducts = productsData.reduce((acc, product) => {
        const category = acc.find(cat => cat.name === product.category);
        if (category) {
          category.products.push(product);
        } else {
          acc.push({
            id: product.category,
            name: product.category,
            products: [product]
          });
        }
        return acc;
      }, [] as Category[]);

      setCategories(groupedProducts);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const categoriesRef = collection(db, 'partners', user.uid, 'categories');
      const categoriesSnapshot = await getDocs(categoriesRef);
      
      const categoriesData = categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
      }));

      setAvailableCategories(categoriesData);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const handleAddProduct = () => {
    setIsEditing(false);
    setEditingProductId(null);
    setIsModalVisible(true);
  };

  const resetNewProduct = () => {
    setNewProduct({
      name: '',
      description: '',
      price: '',
      category: '',
      isActive: true,
      isPromotion: false,
      promotionalPrice: null,
      variations: [],
      requiredSelections: [],
      extras: [],
      image: null
    });
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setIsEditing(false);
    setEditingProductId(null);
    resetNewProduct();
  };

  const pickImageAsync = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setNewProduct(prev => ({
        ...prev,
        image: result.assets[0].uri
      }));
    }
  };

  const toggleProductAvailability = async (product: Product) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const productRef = doc(db, 'partners', user.uid, 'products', product.id);
      await updateDoc(productRef, {
        isActive: !product.isActive
      });

      // Recarrega a lista após a atualização
      loadProducts();
    } catch (error) {
      console.error('Erro ao atualizar disponibilidade:', error);
      Alert.alert('Erro', 'Não foi possível atualizar a disponibilidade do produto');
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      Alert.alert(
        'Confirmar exclusão',
        'Tem certeza que deseja excluir este produto?',
        [
          {
            text: 'Cancelar',
            style: 'cancel'
          },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: async () => {
              const productRef = doc(db, 'partners', user.uid, 'products', product.id);
              await deleteDoc(productRef);
              loadProducts(); // Recarrega a lista
              Alert.alert('Sucesso', 'Produto excluído com sucesso!');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      Alert.alert('Erro', 'Não foi possível excluir o produto');
    }
  };

  const handleEditProduct = async (product: Product) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Converter as variações do produto para o formato do formulário
      const formVariations: FormVariation[] = (product.variations || []).map(variation => ({
        name: variation.name,
        description: variation.options[0]?.name || '',
        // Multiplica por 100 para converter para centavos antes de formatar
        price: formatPrice((variation.options[0]?.extraPrice * 100 || 0).toString()),
        isAvailable: true
      }));

      setNewProduct({
        name: product.name,
        description: product.description || '',
        // Multiplica por 100 para converter para centavos antes de formatar
        price: formatPrice((product.price * 100).toString()),
        category: product.category,
        isActive: product.isActive,
        isPromotion: product.isPromotion || false,
        promotionalPrice: null,
        variations: formVariations,
        requiredSelections: product.requiredSelections.map(selection => ({
          name: selection.name,
          minRequired: selection.minRequired,
          maxRequired: selection.maxRequired,
          options: selection.options.map(option => ({
            name: option.name,
            extraPrice: option.extraPrice || 0
          }))
        })) || [],
        extras: product.extras || [],
        image: product.image || null
      });
      
      setIsEditing(true);
      setEditingProductId(product.id);
      setIsModalVisible(true);
    } catch (error) {
      console.error('Erro ao carregar produto para edição:', error);
      Alert.alert('Erro', 'Não foi possível carregar o produto para edição');
    }
  };

  const formatPrice = (value: string): string => {
    // Remove tudo que não é número
    let numbers = value.replace(/\D/g, '');
    
    // Se não houver números, retorna "0,00"
    if (!numbers) return "0,00";
    
    // Converte para número e divide por 100 para ter os centavos
    const price = Number(numbers) / 100;
    
    // Formata o número com duas casas decimais, usando vírgula como separador
    return price.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true // Isso manterá os separadores de milhar
    }).replace(/\s/g, ''); // Remove possíveis espaços em branco
  };

  const unformatPrice = (value: string): string => {
    return value.replace(/\D/g, '');
  };

  const handleCreateProduct = async () => {
    try {
      if (!newProduct.name || !newProduct.price || !newProduct.category) {
        Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
        return;
      }

      // Converte o preço formatado para número
      const price = Number(unformatPrice(newProduct.price)) / 100;
      if (isNaN(price)) {
        Alert.alert('Erro', 'Preço inválido');
        return;
      }

      const user = auth.currentUser;
      if (!user) return;

      // Converter as variações do formulário para o formato do ProductVariation
      const variations: ProductVariation[] = newProduct.variations.map(variation => ({
        name: variation.name,
        options: [{
          name: variation.description || '',
          extraPrice: Number(unformatPrice(variation.price)) / 100 || 0
        }]
      }));

      // Converter as requiredSelections mantendo o extraPrice
      const requiredSelections: RequiredSelection[] = newProduct.requiredSelections.map(selection => ({
        name: selection.name,
        minRequired: selection.minRequired,
        maxRequired: selection.maxRequired,
        options: selection.options.map(option => ({
          name: option.name,
          extraPrice: option.extraPrice || 0 // Garante que o extraPrice existe
        }))
      }));

      const productData = {
        name: newProduct.name,
        description: newProduct.description,
        price: price,
        category: newProduct.category,
        isActive: newProduct.isActive,
        isPromotion: newProduct.isPromotion,
        promotionalPrice: newProduct.promotionalPrice ? 
          parseFloat(newProduct.promotionalPrice.replace(',', '.')) : null,
        image: newProduct.image,
        sellerId: user.uid,
        variations,
        requiredSelections,
        extras: newProduct.extras.map(extra => ({
          name: extra.name,
          extraPrice: extra.extraPrice,
          minRequired: extra.minRequired,
          maxRequired: extra.maxRequired
        })),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      let productRef;

      if (isEditing && editingProductId) {
        // Atualizar produto existente
        productRef = doc(db, 'partners', user.uid, 'products', editingProductId);
        await updateDoc(productRef, {
          ...productData,
          updatedAt: new Date()
        });
      } else {
        // Criar novo produto
        productRef = doc(collection(db, 'partners', user.uid, 'products'));
        await setDoc(productRef, {
          ...productData,
          id: productRef.id
        });
      }

      Alert.alert('Sucesso', isEditing ? 'Produto atualizado com sucesso!' : 'Produto criado com sucesso!');
      handleCloseModal();
      loadProducts();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      Alert.alert('Erro', 'Erro ao salvar produto');
    }
  };

  const addVariation = () => {
    setNewProduct(prev => ({
      ...prev,
      variations: [...prev.variations, {
        name: '',
        description: '',
        price: '',
        isAvailable: true
      }]
    }));
  };

  const addRequiredSelection = () => {
    setNewProduct(prev => ({
      ...prev,
      requiredSelections: [...prev.requiredSelections, {
        name: '',
        minRequired: 1,
        maxRequired: 1,
        options: []
      }]
    }));
  };

  const addOptionToSelection = (selectionIndex: number) => {
    setNewProduct(prev => {
      const newRequiredSelections = [...prev.requiredSelections];
      newRequiredSelections[selectionIndex].options.push({
        name: '',
        extraPrice: 0 // Adicione o preço padrão
      });
      return {
        ...prev,
        requiredSelections: newRequiredSelections
      };
    });
  };

  const handleAddCategory = async (categoryName: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Verifica se a categoria já existe
      const existingCategory = availableCategories.find(
        cat => cat.name.toLowerCase() === categoryName.toLowerCase()
      );

      if (existingCategory) {
        setNewProduct(prev => ({ ...prev, category: existingCategory.name }));
        return;
      }

      // Cria nova categoria
      const categoriesRef = collection(db, 'partners', user.uid, 'categories');
      const newCategoryRef = await addDoc(categoriesRef, {
        name: categoryName,
        createdAt: new Date()
      });

      const newCategory = {
        id: newCategoryRef.id,
        name: categoryName
      };

      setAvailableCategories(prev => [...prev, newCategory]);
      setNewProduct(prev => ({ ...prev, category: categoryName }));
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      Alert.alert('Erro', 'Não foi possível criar a categoria');
    }
  };

  const renderCategoryInput = () => (
    <View>
      <Text style={styles.inputLabel}>Categoria *</Text>
      <View style={styles.categoryInputContainer}>
        <View style={styles.categoryInputWrapper}>
          <TextInput
            style={[styles.input, styles.categoryInput]}
            value={newProduct.category}
            onChangeText={(text) => setNewProduct(prev => ({ ...prev, category: text }))}
            placeholder="Digite uma nova categoria ou pesquise"
          />
          <Ionicons name="chevron-down" size={20} color="#666" />
        </View>
        {newProduct.category && (
          <ScrollView 
            style={styles.categoryDropdown}
            keyboardShouldPersistTaps="handled"
          >
            {availableCategories
              .filter(cat => 
                cat.name.toLowerCase().includes(newProduct.category.toLowerCase())
              )
              .map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.categoryOption}
                  onPress={() => setNewProduct(prev => ({ 
                    ...prev, 
                    category: category.name 
                  }))}
                >
                  <Ionicons name="folder-outline" size={20} color="#666" style={styles.categoryIcon} />
                  <Text style={styles.categoryOptionText}>{category.name}</Text>
                </TouchableOpacity>
              ))}
            {newProduct.category && !availableCategories.find(
              cat => cat.name.toLowerCase() === newProduct.category.toLowerCase()
            ) && (
              <TouchableOpacity
                style={[styles.categoryOption, styles.newCategoryOption]}
                onPress={() => handleAddCategory(newProduct.category)}
              >
                <Ionicons name="add-circle-outline" size={20} color="#FFA500" style={styles.categoryIcon} />
                <Text style={styles.newCategoryText}>
                  Criar nova categoria "{newProduct.category}"
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );

  const filteredCategories = categories.map(category => ({
    ...category,
    products: category.products.filter(product =>
      product.name.toLowerCase().includes(searchText.toLowerCase())
    )
  })).filter(category => category.products.length > 0);

  const loadProductDetails = async (product: Product) => {
    try {
      setSelectedProduct(product);
      setProductVariations(product.variations);
      setProductOptions(product.requiredSelections.flatMap(selection => selection.options));
      setIsDetailsModalVisible(true);
    } catch (error) {
      console.error('Erro ao carregar detalhes do produto:', error);
      Alert.alert('Erro', 'Não foi possível carregar os detalhes do produto');
    }
  };

  const removeVariation = (index: number) => {
    setNewProduct(prev => ({
      ...prev,
      variations: prev.variations.filter((_, i) => i !== index)
    }));
  };

  const removeRequiredSelection = (index: number) => {
    setNewProduct(prev => ({
      ...prev,
      requiredSelections: prev.requiredSelections.filter((_, i) => i !== index)
    }));
  };

  const removeOptionFromSelection = (selectionIndex: number, optionIndex: number) => {
    setNewProduct(prev => {
      const newRequiredSelections = [...prev.requiredSelections];
      newRequiredSelections[selectionIndex].options = 
        newRequiredSelections[selectionIndex].options.filter((_, i) => i !== optionIndex);
      return {
        ...prev,
        requiredSelections: newRequiredSelections
      };
    });
  };

  const addExtra = () => {
    setNewProduct(prev => ({
      ...prev,
      extras: [...prev.extras, {
        name: '',
        extraPrice: 0,
        minRequired: 0,
        maxRequired: 1
      }]
    }));
  };

  const removeExtra = (index: number) => {
    setNewProduct(prev => ({
      ...prev,
      extras: prev.extras.filter((_, i) => i !== index)
    }));
  };

  // Primeiro, vamos criar uma função auxiliar para formatar o preço do extra
  const formatExtraPrice = (value: number): string => {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: false
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFA500" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header com Busca */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar produtos..."
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
        <TouchableOpacity 
          style={styles.addButtonproduct}
          onPress={handleAddProduct}
        >
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>


      {/* Categorias horizontais */}
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
          onPress={() => setSelectedCategory(null)}
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
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text style={[
              styles.categoryChipText,
              selectedCategory === category.id && styles.selectedCategoryChipText
            ]}>{category.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Lista de Produtos */}
      <ScrollView style={styles.productsList}>
        {filteredCategories
          .filter(category => !selectedCategory || category.id === selectedCategory)
          .map(category => (
          <View key={category.id} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category.name}</Text>
            {category.products.map(product => (
              <TouchableOpacity 
                key={product.id} 
                style={styles.productCard}
                onPress={() => loadProductDetails(product)}
              >
                <Image
                  source={product.image ? { uri: product.image } : require('../../../assets/localhost-file-not-found.jpg')}
                  style={styles.productImage}
                />
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productDescription} numberOfLines={2}>
                    {product.description}
                  </Text>
                  <Text style={styles.productPrice}>
                    R$ {product.price.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.productActions}>
                  <TouchableOpacity
                    onPress={() => toggleProductAvailability(product)}
                    style={[
                      styles.availabilityButton,
                      product.isActive && styles.availableButton
                    ]}
                  >
                    <Ionicons
                      name={product.isActive ? "checkmark-circle" : "close-circle"}
                      size={24}
                      color={product.isActive ? "#4CAF50" : "#FF3B30"}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleEditProduct(product)}
                    style={styles.actionButton}
                  >
                    <Ionicons name="create-outline" size={20} color="#666" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteProduct(product)}
                    style={styles.actionButton}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Modal de Adicionar Produto */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditing ? 'Editar Produto' : 'Novo Produto'}
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <View style={styles.imageSection}>
                <TouchableOpacity 
                  style={styles.imagePickerButton} 
                  onPress={pickImageAsync}
                >
                  <ImageViewer
                    placeholderImageSource={require('../../../assets/localhost-file-not-found.jpg')}
                    selectedImage={newProduct.image}
                  />
                </TouchableOpacity>
                {loading && (
                  <View style={styles.uploadProgress}>
                    <ActivityIndicator size="small" color="#FFA500" />
                  </View>
                )}
              </View>
              <Text style={styles.sectionTitle}>Informações Básicas</Text>
              <TextInput
                style={styles.input}
                value={newProduct.name}
                onChangeText={(text) => setNewProduct(prev => ({ ...prev, name: text }))}
                placeholder="Nome do produto *"
              />
              <TextInput
                style={styles.input}
                value={newProduct.description}
                onChangeText={(text) => setNewProduct(prev => ({ ...prev, description: text }))}
                placeholder="Descrição"
              />
              <TextInput
                style={styles.input}
                value={newProduct.price}
                onChangeText={(text) => {
                  const formattedPrice = formatPrice(text);
                  setNewProduct(prev => ({ ...prev, price: formattedPrice }));
                }}
                placeholder="Preço *"
                keyboardType="numeric"
              />
              {renderCategoryInput()}
              <View style={styles.availableContainer}>
                <Text style={styles.inputLabel}>Disponível</Text>
                <TouchableOpacity
                  onPress={() => setNewProduct(prev => ({ ...prev, isActive: !prev.isActive }))}
                  style={styles.toggleButton}
                >
                  <Ionicons
                    name={newProduct.isActive ? "checkmark-circle" : "close-circle"}
                    size={30}
                    color={newProduct.isActive ? "#4CAF50" : "#FF3B30"}
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionTitle}>Variações</Text>
              {newProduct.variations.map((variation, index) => (
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
                      const newVariations = [...newProduct.variations];
                      newVariations[index].name = text;
                      setNewProduct(prev => ({ ...prev, variations: newVariations }));
                    }}
                    placeholder="Nome da variação"
                  />
                  <TextInput
                    style={styles.input}
                    value={variation.description}
                    onChangeText={(text) => {
                      const newVariations = [...newProduct.variations];
                      newVariations[index].description = text;
                      setNewProduct(prev => ({ ...prev, variations: newVariations }));
                    }}
                    placeholder="Descrição"
                  />
                  <TextInput
                    style={styles.input}
                    value={variation.price}
                    onChangeText={(text) => {
                      const formattedPrice = formatPrice(text);
                      const newVariations = [...newProduct.variations];
                      newVariations[index].price = formattedPrice;
                      setNewProduct(prev => ({ ...prev, variations: newVariations }));
                    }}
                    placeholder="Preço"
                    keyboardType="numeric"
                  />
                </View>
              ))}
              <TouchableOpacity style={styles.addButton} onPress={addVariation}>
                <Text style={styles.addButtonText}>+ Adicionar Variação</Text>
              </TouchableOpacity>

              <Text style={styles.sectionTitle}>Seleções Obrigatórias</Text>
              {newProduct.requiredSelections.map((selection, selectionIndex) => (
                <View key={selectionIndex} style={styles.selectionContainer}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemTitle}>Seleção {selectionIndex + 1}</Text>
                    <TouchableOpacity 
                      style={styles.removeButton}
                      onPress={() => removeRequiredSelection(selectionIndex)}
                    >
                      <Ionicons name="close-circle" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.input}
                    value={selection.name}
                    onChangeText={(text) => {
                      const newSelections = [...newProduct.requiredSelections];
                      newSelections[selectionIndex].name = text;
                      setNewProduct(prev => ({ ...prev, requiredSelections: newSelections }));
                    }}
                    placeholder="Nome da seleção"
                  />
                  
                  <View style={styles.selectionControlRow}>
                    <View style={styles.selectionControl}>
                      <Text style={styles.inputLabel}>Mínimo de escolhas</Text>
                      <View style={styles.maxChoicesContainer}>
                        <TouchableOpacity 
                          style={styles.maxChoicesButton}
                          onPress={() => {
                            const newSelections = [...newProduct.requiredSelections];
                            newSelections[selectionIndex].minRequired = 
                              Math.max(1, newSelections[selectionIndex].minRequired - 1);
                            setNewProduct(prev => ({ ...prev, requiredSelections: newSelections }));
                          }}
                        >
                          <Ionicons name="remove" size={20} color="#666" />
                        </TouchableOpacity>
                        <Text style={styles.maxChoicesText}>{selection.minRequired}</Text>
                        <TouchableOpacity 
                          style={styles.maxChoicesButton}
                          onPress={() => {
                            const newSelections = [...newProduct.requiredSelections];
                            newSelections[selectionIndex].minRequired += 1;
                            setNewProduct(prev => ({ ...prev, requiredSelections: newSelections }));
                          }}
                        >
                          <Ionicons name="add" size={20} color="#666" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    <View style={styles.selectionControl}>
                      <Text style={styles.inputLabel}>Máximo de escolhas</Text>
                      <View style={styles.maxChoicesContainer}>
                        <TouchableOpacity 
                          style={styles.maxChoicesButton}
                          onPress={() => {
                            const newSelections = [...newProduct.requiredSelections];
                            newSelections[selectionIndex].maxRequired = 
                              Math.max(1, newSelections[selectionIndex].maxRequired - 1);
                            setNewProduct(prev => ({ ...prev, requiredSelections: newSelections }));
                          }}
                        >
                          <Ionicons name="remove" size={20} color="#666" />
                        </TouchableOpacity>
                        <Text style={styles.maxChoicesText}>{selection.maxRequired}</Text>
                        <TouchableOpacity 
                          style={styles.maxChoicesButton}
                          onPress={() => {
                            const newSelections = [...newProduct.requiredSelections];
                            newSelections[selectionIndex].maxRequired += 1;
                            setNewProduct(prev => ({ ...prev, requiredSelections: newSelections }));
                          }}
                        >
                          <Ionicons name="add" size={20} color="#666" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Opções da seleção */}
                  {selection.options.map((option, optionIndex) => (
                    <View key={optionIndex} style={styles.optionContainer}>
                      <View style={styles.itemHeader}>
                        <Text style={styles.itemTitle}>Opção {optionIndex + 1}</Text>
                        <TouchableOpacity 
                          style={styles.removeButton}
                          onPress={() => removeOptionFromSelection(selectionIndex, optionIndex)}
                        >
                          <Ionicons name="close-circle" size={24} color="#FF3B30" />
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={styles.input}
                        value={option.name}
                        onChangeText={(text) => {
                          const newSelections = [...newProduct.requiredSelections];
                          newSelections[selectionIndex].options[optionIndex].name = text;
                          setNewProduct(prev => ({ ...prev, requiredSelections: newSelections }));
                        }}
                        placeholder="Nome da opção"
                      />
                      <TextInput
                        style={styles.input}
                        value={formatPrice(option.extraPrice?.toString() || '0')}
                        onChangeText={(text) => {
                          const newSelections = [...newProduct.requiredSelections];
                          newSelections[selectionIndex].options[optionIndex].extraPrice = 
                            Number(unformatPrice(text)) / 100;
                          setNewProduct(prev => ({ ...prev, requiredSelections: newSelections }));
                        }}
                        placeholder="Preço adicional"
                        keyboardType="numeric"
                      />
                    </View>
                  ))}

                  <TouchableOpacity 
                    style={styles.addButton}
                    onPress={() => addOptionToSelection(selectionIndex)}
                  >
                    <Text style={styles.addButtonText}>+ Adicionar Opção</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={styles.addButton} onPress={addRequiredSelection}>
                <Text style={styles.addButtonText}>+ Adicionar Seleção Obrigatória</Text>
              </TouchableOpacity>

              <Text style={styles.sectionTitle}>Opções Adicionais</Text>
              {newProduct.extras.map((extra, index) => (
                <View key={index} style={styles.optionContainer}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemTitle}>Opção {index + 1}</Text>
                    <TouchableOpacity 
                      style={styles.removeButton}
                      onPress={() => removeExtra(index)}
                    >
                      <Ionicons name="close-circle" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.input}
                    value={extra.name}
                    onChangeText={(text) => {
                      const newExtras = [...newProduct.extras];
                      newExtras[index].name = text;
                      setNewProduct(prev => ({ ...prev, extras: newExtras }));
                    }}
                    placeholder="Nome da opção"
                  />
                  <TextInput
                    style={styles.input}
                    value={formatExtraPrice(extra.extraPrice)}
                    onChangeText={(text) => {
                      const numbers = text.replace(/\D/g, '');
                      const newExtras = [...newProduct.extras];
                      
                      if (numbers) {
                        const valueInCents = parseInt(numbers);
                        newExtras[index].extraPrice = valueInCents / 100;
                      } else {
                        newExtras[index].extraPrice = 0;
                      }
                      
                      setNewProduct(prev => ({ ...prev, extras: newExtras }));
                    }}
                    placeholder="Preço adicional"
                    keyboardType="numeric"
                  />
                  
                  <View style={styles.optionControlRow}>
                    <View style={styles.optionControl}>
                      <Text style={styles.inputLabel}>Mínimo de escolhas</Text>
                      <View style={styles.maxChoicesContainer}>
                        <TouchableOpacity 
                          style={styles.maxChoicesButton}
                          onPress={() => {
                            const newExtras = [...newProduct.extras];
                            newExtras[index].minRequired = Math.max(0, newExtras[index].minRequired - 1);
                            setNewProduct(prev => ({ ...prev, extras: newExtras }));
                          }}
                        >
                          <Ionicons name="remove" size={20} color="#666" />
                        </TouchableOpacity>
                        <Text style={styles.maxChoicesText}>{extra.minRequired}</Text>
                        <TouchableOpacity 
                          style={styles.maxChoicesButton}
                          onPress={() => {
                            const newExtras = [...newProduct.extras];
                            newExtras[index].minRequired += 1;
                            setNewProduct(prev => ({ ...prev, extras: newExtras }));
                          }}
                        >
                          <Ionicons name="add" size={20} color="#666" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    <View style={styles.optionControl}>
                      <Text style={styles.inputLabel}>Máximo de escolhas</Text>
                      <View style={styles.maxChoicesContainer}>
                        <TouchableOpacity 
                          style={styles.maxChoicesButton}
                          onPress={() => {
                            const newExtras = [...newProduct.extras];
                            newExtras[index].maxRequired = Math.max(1, newExtras[index].maxRequired - 1);
                            setNewProduct(prev => ({ ...prev, extras: newExtras }));
                          }}
                        >
                          <Ionicons name="remove" size={20} color="#666" />
                        </TouchableOpacity>
                        <Text style={styles.maxChoicesText}>{extra.maxRequired}</Text>
                        <TouchableOpacity 
                          style={styles.maxChoicesButton}
                          onPress={() => {
                            const newExtras = [...newProduct.extras];
                            newExtras[index].maxRequired += 1;
                            setNewProduct(prev => ({ ...prev, extras: newExtras }));
                          }}
                        >
                          <Ionicons name="add" size={20} color="#666" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
              <TouchableOpacity style={styles.addButton} onPress={addExtra}>
                <Text style={styles.addButtonText}>+ Adicionar Opção Adicional</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.footerButton, styles.cancelButton]}
                onPress={handleCloseModal}
              >
                <Text style={styles.footerButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerButton, styles.createButton]}
                onPress={handleCreateProduct}
              >
                <Text style={[styles.footerButtonText, styles.createButtonText]}>
                  {isEditing ? 'Atualizar Produto' : 'Criar Produto'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Detalhes do Produto */}
      <Modal
        visible={isDetailsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.detailsModalContent]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => setIsDetailsModalVisible(false)}
              >
                <Ionicons name="arrow-back" size={24} color="#666" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Detalhes do Produto</Text>
              <View style={styles.headerSpacer} />
            </View>

            <ScrollView style={styles.modalForm}>
              {selectedProduct && (
                <>
                  <Image
                    source={selectedProduct.image ? 
                      { uri: selectedProduct.image } : 
                      require('../../../assets/localhost-file-not-found.jpg')
                    }
                    style={styles.detailsImage}
                  />

                  <View style={styles.detailsSection}>
                    <View style={styles.detailsHeader}>
                      <Text style={styles.productDetailName}>{selectedProduct.name}</Text>
                      <Text style={styles.productDetailPrice}>
                        R$ {selectedProduct.price.toFixed(2)}
                      </Text>
                    </View>
                    {selectedProduct.description && (
                      <Text style={styles.productDetailDescription}>
                        {selectedProduct.description}
                      </Text>
                    )}
                  </View>

                  {productVariations.length > 0 && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.sectionTitle}>Variações</Text>
                      {productVariations.map((variation, index) => (
                        <View 
                          key={`${variation.name}-${index}`}
                          style={[
                            styles.variationItem,
                            index === productVariations.length - 1 && styles.lastItem
                          ]}
                        >
                          <View style={styles.variationHeader}>
                            <View style={styles.variationInfo}>
                              <Text style={styles.variationName}>{variation.name}</Text>
                              {variation.options.map((option, optIndex) => (
                                <Text key={`${option.name}-${optIndex}`} style={styles.variationDescription}>
                                  {option.name} {option.extraPrice > 0 && `(+R$ ${option.extraPrice.toFixed(2)})`}
                                </Text>
                              ))}
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {selectedProduct?.requiredSelections.map((selection, index) => (
                    <View 
                      key={`${selection.name}-${index}`}
                      style={[
                        styles.optionItem,
                        index === selectedProduct.requiredSelections.length - 1 && styles.lastItem
                      ]}
                    >
                      <View style={styles.optionHeader}>
                        <View style={styles.optionInfo}>
                          <Text style={styles.optionName}>{selection.name}</Text>
                          <Text style={styles.optionDetails}>
                            <Text>{selection.minRequired > 0 ? 'Obrigatório' : 'Opcional'}</Text>
                            <Text style={styles.bulletPoint}> • </Text>
                            <Text>Mín: {selection.minRequired} • Máx: {selection.maxRequired}</Text>
                          </Text>
                        </View>
                        <View>
                          {selection.options.map((option, optIndex) => (
                            <Text key={`${option.name}-${optIndex}`} style={styles.optionPrice}>
                              {option.name}
                            </Text>
                          ))}
                        </View>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  addButtonproduct: {
    backgroundColor: '#FFA500',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',

    elevation: 2,
  },
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
  productsList: {
    padding: 8,
    marginTop: 4,
  },
  categorySection: {
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
    marginLeft: 4,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 8,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  productImage: {
    width: 65,
    height: 65,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
  },
  productInfo: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  productDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFA500',
  },
  productActions: {
    justifyContent: 'space-between',
    paddingLeft: 8,
    gap: 8,
  },
  availabilityButton: {
    padding: 4,
  },
  availableButton: {
    opacity: 1,
  },
  actionButton: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalForm: {
    maxHeight: '80%',
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  availableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  toggleButton: {
    padding: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  footerButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  createButton: {
    backgroundColor: '#FFA500',
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  createButtonText: {
    color: '#fff',
  },
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
  optionContainer: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
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
  imageSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  imagePickerButton: {
    width: 150,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  uploadProgress: {
    marginTop: 8,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  categoryInputContainer: {
    position: 'relative',
    zIndex: 1,
    marginBottom: 16,
  },
  categoryInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  categoryInput: {
    flex: 1,
    marginBottom: 0,
    borderWidth: 0,
    paddingRight: 30,
  },
  categoryDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    maxHeight: 200,
    zIndex: 2,
    elevation: 3,
    marginTop: 4,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryIcon: {
    marginRight: 8,
  },
  categoryOptionText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  newCategoryOption: {
    backgroundColor: '#fff',
    borderBottomWidth: 0,
  },
  newCategoryText: {
    color: '#FFA500',
    fontWeight: '500',
    fontSize: 15,
    flex: 1,
  },
  optionControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  optionControl: {
    flex: 1,
    alignItems: 'center',
  },
  maxChoicesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f9',
    borderRadius: 8,
    padding: 4,
  },
  maxChoicesButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  maxChoicesText: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 16,
    color: '#333',
  },
  detailsModalContent: {
    width: '100%',
    height: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: 'auto',
  },
  backButton: {
    padding: 8,
  },
  detailsImage: {
    width: '100%',
    height: 180,
    borderRadius: 0,
    marginBottom: 0,
  },
  detailsSection: {
    marginBottom: 16,
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productDetailName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 16,
  },
  productDetailDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  productDetailPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFA500',
  },
  lastItem:{
    borderBottomWidth: 0,
  },
  variationItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },

  variationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  variationInfo: {
    flex: 1,
    marginRight: 16,
  },
  variationName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  variationDescription: {
    fontSize: 13,
    color: '#666',
  },
  optionItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  optionInfo: {
    flex: 1,
    marginRight: 16,
  },
  optionName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  optionDetails: {
    fontSize: 13,
    color: '#666',
  },
  optionPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFA500',
  },
  headerSpacer: {
    width: 24,
  },
  bulletPoint: {
    color: '#666',
  },
  selectionContainer: {
    marginBottom: 16,
  },
  selectionControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  selectionControl: {
    flex: 1,
    alignItems: 'center',
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
});
