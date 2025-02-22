import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, collection, getDocs, addDoc, updateDoc, deleteDoc, setDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../../../config/firebase';
import * as ImagePicker from 'expo-image-picker';
import { usePlan } from '@/contexts/PlanContext';
import { useRouter } from 'expo-router';
import { SearchHeader } from '@/components/ProductCatalog/SearchHeader';
import { CategoryList } from '@/components/ProductCatalog/CategoryList';
import { ProductCard } from '@/components/ProductCatalog/ProductCard';
import { ProductFormModal } from '@/components/ProductCatalog/ProductFormModal';
import { ProductDetailsModal } from '@/components/ProductCatalog/ProductDetailsModal';

interface ProductOption {
  name: string;
  price?: number;
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

const defaultProductImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/wD/AP+gvaeTAAABKklEQVR4nO3ZMQqDQBRF0RnIFrKubCB1tiH774KUbkQhYhCdl3MqCx8Xq4v4EwEAAAAAAAAAAP9tqqrHb/bnqprH1mbxZxZc85D0lvSS9Jb0yJhZbG0Wf2bBNQ9Jb0kvSW9Jj4yZxdZm8WcWXPOQ9Jb0kvSW9MiYWWxtFn9mwTUPSW9JL0lvSY+MmcXWZvFnFlzzkPSW9JL0lvTImFlsbRZ/ZsE1D0lvSS9Jb0mPjJnF1mbxZxZc85D0lvSS9Jb0yJhZbG0Wf2bBNQ9Jb0kvSW9Jj4yZxdZm8WcWXPOQ9Jb0kvSW9MiYWWxtFn9mwTUPSW9JL0lvSY+MmcXWZvFnFlzzkPSW9JL0lvTImFlsbRZ/ZsE1D0lvSS9Jb0mPjJnF1mYBAAAAAAAAAAAAwCndAZJZYGwJVbsyAAAAAElFTkSuQmCC';

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
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const planContext = usePlan();
  const { isPremium, getPlanLimits } = planContext || { isPremium: false, getPlanLimits: () => ({ maxProducts: 5 }) };
  const limits = getPlanLimits ? getPlanLimits() : { maxProducts: 5 };
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const router = useRouter();
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  useEffect(() => {
    if (categories.length > 0) {
      checkPlanDowngrade();
    }
  }, [isPremium, categories]);

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

      // Filtra produtos ativos se estiver no plano gratuito
      const filteredProducts = !isPremium 
        ? productsData.map(product => ({
            ...product,
            isActive: product.isActive && categories
              .flatMap(cat => cat.products)
              .filter(p => p.isActive)
              .indexOf(product) < limits.maxProducts
          }))
        : productsData;

      // Agrupar produtos por categoria
      const groupedProducts = filteredProducts.reduce((acc, product) => {
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
    const totalProducts = categories.reduce((acc, category) => 
      acc + category.products.length, 0);

    // Verifica se pode adicionar mais produtos
    if (!isPremium && totalProducts >= limits.maxProducts) {
      setShowLimitWarning(true);
      return;
    }

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
    setEditingProduct(null);
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

      // Se estiver tentando ativar o produto
      if (!product.isActive) {
        // Conta quantos produtos ativos existem
        const activeProductsCount = categories.reduce((acc, category) => 
          acc + category.products.filter(p => p.isActive).length, 0);

        // Verifica se atingiu o limite (apenas para plano não premium)
        if (!isPremium && activeProductsCount >= limits.maxProducts) {
          Alert.alert(
            'Limite Atingido',
            `Seu plano atual permite apenas ${limits.maxProducts} produtos ativos. Desative outro produto ou faça upgrade para o plano Premium.`,
            [
              {
                text: 'Fazer Upgrade',
                onPress: handleUpgrade,
              },
              {
                text: 'Gerenciar Produtos',
                onPress: handleManageActiveProducts,
              },
              {
                text: 'Cancelar',
                style: 'cancel',
              },
            ]
          );
          return;
        }
      }

      const productRef = doc(db, 'partners', user.uid, 'products', product.id);
      await updateDoc(productRef, {
        isActive: !product.isActive,
        updatedAt: new Date() // Atualiza a data de modificação
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
      setEditingProduct(product);
      setIsEditing(true);
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

      if (!isPremium && categories.reduce((acc, category) => acc + category.products.length, 0) >= limits.maxProducts) {
        setShowLimitWarning(true);
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
          price: Number(unformatPrice(variation.price)) / 100 || 0
        }]
      }));

      // Converter as requiredSelections sem o price
      const requiredSelections: RequiredSelection[] = newProduct.requiredSelections.map(selection => ({
        name: selection.name || '',
        minRequired: selection.minRequired || 1,
        maxRequired: selection.maxRequired || 1,
        options: selection.options.map(option => ({
          name: option.name || ''
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
        updatedAt: new Date()
      };

      if (isEditing && editingProduct) {
        // Atualizar produto existente
        const productRef = doc(db, 'partners', user.uid, 'products', editingProduct.id);
        await updateDoc(productRef, productData);
        Alert.alert('Sucesso', 'Produto atualizado com sucesso!');
      } else {
        // Criar novo produto
        const productRef = doc(collection(db, 'partners', user.uid, 'products'));
        await setDoc(productRef, {
          ...productData,
          id: productRef.id,
          createdAt: new Date()
        });
        Alert.alert('Sucesso', 'Produto criado com sucesso!');
      }

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
        name: ''
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


  const safeStringCompare = (text: string | undefined | null, search: string | undefined | null): boolean => {
    if (!text || !search) return true;
    return text.toLowerCase().includes(search.toLowerCase());
  };

  const filteredCategories = categories.map(category => ({
    ...category,
    products: category.products.filter(product => 
      safeStringCompare(product.name, searchText)
    )
  })).filter(category => category.products.length > 0);


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


  const currentProductCount = categories.reduce((acc, category) => 
    acc + category.products.length, 0);

  const handleUpgrade = () => {
    setShowLimitWarning(false);
    router.push('/(auth)/drawer/signature');
  };

  const checkPlanDowngrade = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const totalActiveProducts = categories.reduce((acc, category) => 
        acc + category.products.filter(p => p.isActive).length, 0);
      
      // Se não é premium e tem mais produtos ativos que o limite
      if (!isPremium && totalActiveProducts > limits.maxProducts) {
        console.log('Downgrade detectado:', { totalActiveProducts, limit: limits.maxProducts });
        
        // Pré-seleciona os produtos mais recentes
        const activeProducts = categories
          .flatMap(cat => cat.products)
          .filter(p => p.isActive)
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

        // Desativa automaticamente os produtos excedentes
        const productsToKeepActive = activeProducts.slice(0, limits.maxProducts);
        const productsToDeactivate = activeProducts.slice(limits.maxProducts);

        // Atualiza o status dos produtos no Firestore
        const batch = writeBatch(db);
        
        // Mantém ativos apenas os produtos dentro do limite
        productsToKeepActive.forEach(product => {
          const productRef = doc(db, 'partners', user.uid, 'products', product.id);
          batch.update(productRef, { isActive: true });
        });

        // Desativa os produtos excedentes
        productsToDeactivate.forEach(product => {
          const productRef = doc(db, 'partners', user.uid, 'products', product.id);
          batch.update(productRef, { isActive: false });
        });

        await batch.commit();
        
        // Recarrega os produtos para atualizar a interface
        loadProducts();

        Alert.alert(
          'Plano Alterado',
          `Seu plano atual permite apenas ${limits.maxProducts} produtos ativos. Os produtos excedentes foram desativados automaticamente.`,
          [
            {
              text: 'Fazer Upgrade',
              onPress: handleUpgrade,
              style: 'default',
            },
            {
              text: 'OK',
              style: 'cancel',
            },
          ]
        );
      }
    } catch (error) {
      console.error('Erro ao ajustar produtos:', error);
      Alert.alert('Erro', 'Não foi possível ajustar os produtos ativos');
    }
  };

  const isProductExceedingLimit = (product: Product) => {
    if (isPremium) return false;
    
    const activeProducts = categories
      .flatMap(cat => cat.products)
      .filter(p => p.isActive)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    const productIndex = activeProducts.findIndex(p => p.id === product.id);
    return productIndex >= limits.maxProducts;
  };

  const handleProductPress = (product: Product) => {
    if (!isPremium && isProductExceedingLimit(product)) {
      // Pré-seleciona os produtos mais recentes até o limite
      const activeProducts = categories
        .flatMap(cat => cat.products)
        .filter(p => p.isActive)
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      setSelectedProducts(new Set(
        activeProducts
          .slice(0, limits.maxProducts)
          .map(p => p.id)
      ));
      setShowDowngradeModal(true);
    } else {
      setSelectedProduct(product);
      setIsDetailsModalVisible(true);
    }
  };

  const handleProductSelection = (productId: string) => {
    const newSelection = new Set(selectedProducts);
    
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else if (newSelection.size < limits.maxProducts) {
      newSelection.add(productId);
    } else {
      Alert.alert('Limite atingido', `Você só pode manter ${limits.maxProducts} produtos ativos no plano atual.`);
      return;
    }
    
    setSelectedProducts(newSelection);
  };

  const handleConfirmProductSelection = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Atualiza o status de todos os produtos
      const batch = writeBatch(db);
      
      for (const category of categories) {
        for (const product of category.products) {
          const productRef = doc(db, 'partners', user.uid, 'products', product.id);
          batch.update(productRef, {
            isActive: selectedProducts.has(product.id)
          });
        }
      }

      await batch.commit();
      setShowDowngradeModal(false);
      loadProducts(); // Recarrega os produtos
      
      Alert.alert(
        'Produtos atualizados',
        'Os produtos selecionados foram mantidos ativos. Os demais foram desativados.'
      );
    } catch (error) {
      console.error('Erro ao atualizar produtos:', error);
      Alert.alert('Erro', 'Não foi possível atualizar os produtos');
    }
  };

  const handleManageActiveProducts = () => {
    const activeProducts = categories
      .flatMap(cat => cat.products)
      .filter(p => p.isActive)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    setSelectedProducts(new Set(
      activeProducts
        .slice(0, limits.maxProducts)
        .map(p => p.id)
    ));
    setShowDowngradeModal(true);
  };

  // Função para verificar se excedeu o limite de produtos
  const hasExceededLimit = () => {
    if (isPremium) return false;
    
    const totalActiveProducts = categories.reduce((acc, category) => 
      acc + category.products.filter(p => p.isActive).length, 0);
    
    return totalActiveProducts > limits.maxProducts;
  };

  const productFormProps = {
    onPickImage: pickImageAsync,
    availableCategories,
    handleAddCategory,
    formatPrice,
    unformatPrice,
    addVariation,
    removeVariation,
    addRequiredSelection,
    removeRequiredSelection,
    addOptionToSelection,
    removeOptionFromSelection,
    addExtra,
    removeExtra,
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFA500" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <SearchHeader 
        searchText={searchText}
        onSearchChange={setSearchText}
        onAddProduct={handleAddProduct}
        onManageProducts={handleManageActiveProducts}
        showManageButton={!isPremium && hasExceededLimit()}
        isAddButtonDisabled={!isPremium && currentProductCount >= limits.maxProducts}
      />

      <CategoryList 
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      <ScrollView 
        style={styles.productsList}
        contentContainerStyle={styles.productsListContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredCategories
          .filter(category => !selectedCategory || category.id === selectedCategory)
          .map(category => (
          <View key={category.id} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category.name}</Text>
            {category.products.map(product => (
                <ProductCard
                key={product.id}
                  product={product}
                  isExceedingLimit={isProductExceedingLimit(product)}
                  isPremium={isPremium}
                  onToggleAvailability={() => toggleProductAvailability(product)}
                  onEdit={() => handleEditProduct(product)}
                  onDelete={() => handleDeleteProduct(product)}
                onPress={() => handleProductPress(product)}
                  defaultImage={defaultProductImage}
                />
            ))}
          </View>
        ))}
      </ScrollView>

      <ProductFormModal 
        visible={isModalVisible}
        isEditing={isEditing}
        newProduct={newProduct}
        editingProduct={editingProduct || undefined}
        onClose={handleCloseModal}
        onSave={handleCreateProduct}
        onUpdateProduct={(updates) => setNewProduct(prev => ({ ...prev, ...updates }))}
        {...productFormProps}
      />

      <ProductDetailsModal 
        visible={isDetailsModalVisible}
        product={selectedProduct}
        onClose={() => setIsDetailsModalVisible(false)}
        defaultImage={defaultProductImage}
      />

      {/* Modal de aviso de limite */}
      <Modal
        visible={showLimitWarning}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLimitWarning(false)}
      >
        <View style={styles.limitWarningContainer}>
          <View style={styles.limitWarningContent}>
            <Text style={styles.limitWarningText}>
              Limite de produtos atingido
            </Text>
            <Text style={styles.limitWarningDetails}>
              Você atingiu o limite de {limits.maxProducts} produtos do plano gratuito.
            </Text>
            <Text style={styles.limitWarningDetails}>
              Para adicionar mais produtos, faça upgrade para o plano Premium!
            </Text>
            <View style={styles.warningButtons}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowLimitWarning(false)}
              >
                <Text style={styles.closeButtonText}>Fechar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={handleUpgrade}
              >
                <Text style={styles.upgradeButtonText}>Fazer Upgrade</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Downgrade */}
      <Modal
        visible={showDowngradeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDowngradeModal(false)}
      >
        <View style={styles.downgradeModalContainer}>
          <View style={styles.downgradeModalContent}>
            <Text style={styles.downgradeTitle}>Selecione os produtos ativos</Text>
            <Text style={styles.downgradeDescription}>
              Seu plano atual permite apenas {limits.maxProducts} produtos ativos.
              Selecione quais produtos você deseja manter ativos:
            </Text>
            
            <Text style={styles.selectionCounter}>
              Selecionados: {selectedProducts.size}/{limits.maxProducts}
            </Text>

            <ScrollView style={styles.productSelectionList}>
              {categories.map(category => (
                <View key={category.id}>
                  <Text style={styles.categoryTitle}>{category.name}</Text>
                  {category.products.map(product => (
                    <TouchableOpacity
                      key={product.id}
                      style={[
                        styles.productSelectionItem,
                        selectedProducts.has(product.id) && styles.productSelectionItemSelected
                      ]}
                      onPress={() => handleProductSelection(product.id)}
                    >
                      <View style={styles.productSelectionInfo}>
                        <Text style={styles.productSelectionName}>{product.name}</Text>
                        <Text style={styles.productSelectionPrice}>
                          R$ {product.price.toFixed(2)}
                        </Text>
                        <Text style={[
                          styles.productStatusLabel,
                          { color: product.isActive ? '#4CAF50' : '#666' }
                        ]}>
                          {product.isActive ? 'Ativo' : 'Inativo'}
                        </Text>
                      </View>
                      <Ionicons
                        name={selectedProducts.has(product.id) ? "checkmark-circle" : "ellipse-outline"}
                        size={24}
                        color={selectedProducts.has(product.id) ? "#FFA500" : "#666"}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>

            <View style={styles.downgradeModalFooter}>
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={handleUpgrade}
              >
                <Text style={styles.upgradeButtonText}>Fazer Upgrade</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.confirmSelectionButton,
                  selectedProducts.size === limits.maxProducts && styles.confirmSelectionButtonEnabled
                ]}
                onPress={handleConfirmProductSelection}
                disabled={selectedProducts.size !== limits.maxProducts}
              >
                <Text style={styles.confirmSelectionButtonText}>
                  Confirmar Seleção
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
  addProductButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  addProductButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
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
    paddingBottom: 100,
  },
  productsListContent: {
    paddingBottom: 150,
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
    backgroundColor: '#fff',
  },
  modalContent: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
    padding: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  modalForm: {
    flex: 1,
    padding: 16,
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
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
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
  lastItem: {
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
    width: 40,
  },
  bulletPoint: {
    color: '#666',
  },
  selectionContainer: {
    marginBottom: 16,
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
  limitWarningContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  limitWarningContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    maxWidth: '80%',
    maxHeight: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  limitWarningText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10
  },
  limitWarningDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10
  },
  warningButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  closeButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    flex: 1,
  },
  closeButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  upgradeButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFA500',
    alignItems: 'center',
    marginTop: 15
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  downgradeModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  downgradeModalContent: {
    backgroundColor: '#fff',
    width: '90%',
    maxHeight: '80%',
    borderRadius: 10,
    padding: 20,
  },
  downgradeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  downgradeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  selectionCounter: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFA500',
    marginBottom: 10,
  },
  productSelectionList: {
    maxHeight: '60%',
    paddingBottom: 20,
  },
  productSelectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginBottom: 8,
  },
  productSelectionItemSelected: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FFA500',
    borderWidth: 1,
  },
  productSelectionInfo: {
    flex: 1,
  },
  productSelectionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  productSelectionPrice: {
    fontSize: 14,
    color: '#666',
  },
  downgradeModalFooter: {
    marginTop: 20,
    gap: 10,
  },
  confirmSelectionButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#ccc',
    alignItems: 'center',
  },
  confirmSelectionButtonEnabled: {
    backgroundColor: '#4CAF50',
  },
  confirmSelectionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  productCardExceeding: {
    backgroundColor: '#FFE0E0',
    borderColor: '#FFA07A',
    borderWidth: 1,
  },
  productCardInactive: {
    opacity: 0.7,
    backgroundColor: '#f5f5f5',
  },
  exceedingLabel: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  productStatusLabel: {
    fontSize: 12,
    marginTop: 4,
  },
});
