import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, collection, getDocs, updateDoc, deleteDoc, setDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../../../config/firebase';
import * as ImagePicker from 'expo-image-picker';
import { usePlan } from '@/contexts/PlanContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useFocusEffect } from 'expo-router';
import { ProductFormModal } from '@/components/ProductCatalog/ProductFormModal';
import { ProductDetailsModal } from '@/components/ProductCatalog/ProductDetailsModal';
import { PromotionModal } from '@/components/ProductCatalog/PromotionModal';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../../../config/firebase';
import { categoryService } from '@/services/categoryService';
import { Product, Promotion } from '@/types/product';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { CategoryTabView } from '@/components/ProductCatalog/CategoryTabView';
import { CategoryProductsView } from '@/components/ProductCatalog/CategoryProductsView';
import { LimitWarningModal } from '@/components/ProductCatalog/LimitWarningModal';


interface ProductOption {
  name: string;
  price?: number;
  isActive?: boolean;
}

interface ProductVariation {
  name: string;
  options: ProductOption[];
  minRequired?: number;
}

interface RequiredSelection {
  name: string;
  minRequired: number;
  maxRequired: number;
  options: {
    name: string;
    price?: string;
    isActive?: boolean;
  }[];
}

interface Extra {
  name: string;
  extraPrice: number;
  minRequired: number;
  maxRequired: number;
}

interface Category {
  id: string;
  name: string;
  products: Product[];
}

interface FormVariation {
  name: string;
  price: string;
  isAvailable: boolean;
  minRequired?: number;
}

interface NewProduct {
  name: string;
  description: string;
  price: string;
  category: string;
  categoryId: string;
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
    categoryId: '',
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
  const { isAuthenticated, user } = useAuth();
  
  const { isPremium, getPlanLimits } = planContext || { isPremium: false, getPlanLimits: () => ({ maxProducts: 5 }) };
  const limits = getPlanLimits ? getPlanLimits() : { maxProducts: 5 };
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const router = useRouter();
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isPromotionModalVisible, setIsPromotionModalVisible] = useState(false);
  const [selectedProductForPromotion, setSelectedProductForPromotion] = useState<Product | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('');
  
  // Cache para evitar recálculos desnecessários
  const productsCacheRef = useRef<Map<string, Product[]>>(new Map());
  
  // Flag para controlar se os produtos já foram carregados
  const productsLoadedRef = useRef<boolean>(false);
  
  // Adiciona a categoria de promoções
  const promotionCategory: CategoryOption = {
    id: 'promotions',
    name: 'Promoções'
  };

  // Função para limpar cache quando necessário
  const clearCache = useCallback(() => {
    productsCacheRef.current.clear();
  }, []);

  // Função para forçar recarregamento quando necessário
  const forceReloadProducts = useCallback(() => {
    productsLoadedRef.current = false;
    loadProducts(true);
  }, []);

  // Função para limpar cache de imagens (pode ser chamada quando necessário)
  const clearImageCache = useCallback(() => {
    // Limpa o cache global de imagens do OptimizedImage
    // Nota: Esta função pode ser chamada quando necessário para limpar o cache
  }, []);

  // Função para controlar carregamento de imagens por categoria
  const shouldLoadImagesForCategory = useCallback((categoryId: string) => {
    // Sempre carrega imagens da categoria ativa
    return categoryId === activeCategory;
  }, [activeCategory]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    
    const initializeData = async () => {
      try {
        await Promise.all([
          loadProducts(),
          loadCategories()
        ]);
        productsLoadedRef.current = true;
      } catch (error) {
        console.error('ProductCatalog: Erro no carregamento inicial:', error);
        setLoading(false);
      }
    };
    
    initializeData();
  }, [isAuthenticated]);

  // useFocusEffect otimizado - só recarrega se necessário
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && !productsLoadedRef.current) {
        loadProducts();
      }
      return () => {
        // Limpeza se necessário
      };
    }, [isAuthenticated])
  );

  useEffect(() => {
    if (categories.length > 0) {
      checkPlanDowngrade();
    }
  }, [isPremium, categories]);

  // Otimizado: só limpa o cache quando realmente necessário
  useEffect(() => {
    // Só limpa o cache se o searchText mudou (filtro de pesquisa)
    if (searchText) {
      productsCacheRef.current.clear();
    }
  }, [searchText]);

  // Define a categoria ativa inicial
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      const productsInPromotion = categories.flatMap(category => 
        category.products.filter(product => product.isPromotion === true)
      );
      
      // Se há produtos em promoção, começa com a categoria de promoções
      if (productsInPromotion.length > 0) {
        setActiveCategory('promotions');
      } else {
        // Senão, começa com a primeira categoria disponível
        setActiveCategory(categories[0].id);
      }
    }
  }, [categories, activeCategory]);

  // Removido o useEffect que sempre limpava o cache


  const loadProducts = async (forceReload = false) => {
    try {
      // Se não for force reload e os produtos já foram carregados, não recarrega
      if (!forceReload && productsLoadedRef.current) {
        return;
      }

      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      const productsRef = collection(db, 'partners', user.uid, 'products');
      const productsSnapshot = await getDocs(productsRef);
      
      const productsData = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isPromotion: doc.data().isPromotion || false,
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as Product[];

      // Filtra produtos ativos se estiver no plano gratuito
      const filteredProducts = !isPremium 
        ? productsData.map(product => ({
            ...product,
            isActive: product.isActive
          }))
        : productsData;

      // Agrupar produtos por categoria
      const groupedProducts = filteredProducts.reduce((acc, product) => {
        const category = acc.find(cat => cat.id === product.categoryId);
        if (category) {
          category.products.push(product);
        } else {
          acc.push({
            id: product.categoryId,
            name: product.category,
            products: [product]
          });
        }
        return acc;
      }, [] as Category[]);

      setCategories(groupedProducts);
      
      // Limpa o cache quando os produtos são atualizados
      if (forceReload) {
        productsCacheRef.current.clear();
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      setCategories([]); // Define como array vazio em caso de erro
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setAvailableCategories([promotionCategory]);
        return;
      }

      // Buscamos tanto categorias globais quanto as personalizadas do parceiro
      const categoriesData = [];

      // 1. Buscar categorias personalizadas do parceiro
      try {
        const partnerCategories = await categoryService.getPartnerCategories();
        categoriesData.push(...partnerCategories);
      } catch (error) {
        console.error('Erro ao carregar categorias personalizadas:', error);
        // Continua mesmo se falhar
      }

      // 2. Categorias do parceiro salvas diretamente (para compatibilidade)
      try {
        const categoriesRef = collection(db, 'partners', user.uid, 'categories');
        const categoriesSnapshot = await getDocs(categoriesRef);
        
        const localCategories = categoriesSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
        }));

        // Filtra para não adicionar categorias duplicadas
        for (const category of localCategories) {
          if (!categoriesData.some(c => c.id === category.id)) {
            categoriesData.push(category);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar categorias locais:', error);
        // Continua mesmo se falhar
      }

      // Se não há categorias, adiciona algumas categorias padrão
      let finalCategories = [promotionCategory, ...categoriesData];
      
      if (categoriesData.length === 0) {
        const defaultCategories = [
          { id: 'default-food', name: 'Comida' },
          { id: 'default-drinks', name: 'Bebidas' },
          { id: 'default-desserts', name: 'Sobremesas' }
        ];
        finalCategories = [promotionCategory, ...defaultCategories];
      }
      
      setAvailableCategories(finalCategories);
    } catch (error) {
      console.error('Erro geral ao carregar categorias:', error);
      // Em caso de erro, pelo menos define a categoria de promoções
      setAvailableCategories([promotionCategory]);
    }
  };

  const handleAddProduct = async () => {
    const totalProducts = categories.reduce((acc, category) => 
      acc + category.products.length, 0);

    // Verifica se pode adicionar mais produtos
    if (!isPremium && totalProducts >= limits.maxProducts) {
      setShowLimitWarning(true);
      return;
    }

    // Recarrega as categorias antes de abrir o modal
    await loadCategories();
    
    setIsEditing(false);
    setEditingProductId(null);
    resetNewProduct();
    setIsModalVisible(true);
  };

  const resetNewProduct = () => {
    setNewProduct({
      name: '',
      description: '',
      price: '',
      category: '',
      categoryId: '',
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
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        setNewProduct(prev => ({
          ...prev,
          image: result.assets[0].uri
        }));
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem');
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
                text: 'Upgrade',
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
        await loadProducts(true); // Force reload para atualizar dados
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
              try {
                // Excluir a imagem do Storage se existir
                if (product.image) {
                  const imageRef = ref(storage, `partners/${user.uid}/products/${product.id}/product.jpg`);
                  try {
                    await deleteObject(imageRef);
                  } catch (error) {
                    console.error('Erro ao excluir imagem do storage:', error);
                    // Continua mesmo se falhar ao deletar a imagem
                  }
                }

                // Excluir o documento do produto
                const productRef = doc(db, 'partners', user.uid, 'products', product.id);
                await deleteDoc(productRef);
                
                // Recarrega a lista de produtos
                await loadProducts(true); // Force reload para atualizar dados
                Alert.alert('Sucesso', 'Produto excluído com sucesso!');
              } catch (error) {
                console.error('Erro ao excluir produto:', error);
                Alert.alert('Erro', 'Não foi possível excluir o produto');
              }
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

      // Atualiza o formulário com os dados do produto
      setNewProduct({
        name: product.name,
        description: product.description || '',
        price: formatPrice((product.price * 100).toString()),
        category: product.category,
        categoryId: product.categoryId || '',
        isActive: product.isActive,
        isPromotion: product.isPromotion || false,
        promotionalPrice: null,
        variations: product.variations.flatMap(variation => 
          variation.options.map(option => ({
            name: option.name,
            price: formatPrice(((option.price ?? 0) * 100).toString()),
            isAvailable: true
          }))
        ),
        requiredSelections: product.requiredSelections.map(selection => ({
          name: selection.name,
          minRequired: selection.minRequired,
          maxRequired: selection.maxRequired,
          options: selection.options.map(option => ({
            name: option.name,
            isActive: option.isActive !== false // Garante que o campo isActive seja carregado
          }))
        })),
        extras: product.extras || [],
        image: product.image || null
      });
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

  const uploadProductImage = async (uri: string, productId: string): Promise<string> => {
    try {
      // Converter URI em blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');

      // Criar referência no Storage com caminho fixo
      const storagePath = `partners/${user.uid}/products/${productId}/product.jpg`;
      const storageRef = ref(storage, storagePath);
      
      // Fazer upload
      await uploadBytes(storageRef, blob);
      
      // Obter URL de download
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      throw error;
    }
  };

  const handleCreateProduct = async () => {
    try {
      setLoading(true);
      
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      if (!newProduct.name.trim()) {
        Alert.alert('Erro', 'O produto precisa ter um nome');
        return;
      }

      if (!newProduct.price.trim()) {
        Alert.alert('Erro', 'O produto precisa ter um preço');
        return;
      }

      if (!newProduct.category.trim()) {
        Alert.alert('Erro', 'Selecione uma categoria para o produto');
        return;
      }

      // Validar se todas as seleções obrigatórias têm pelo menos uma opção ativa
      const invalidSelections = newProduct.requiredSelections.filter(
        selection => selection.options.filter(option => option.isActive !== false).length === 0
      );

      if (invalidSelections.length > 0) {
        Alert.alert(
          'Erro',
          'Todas as seleções obrigatórias precisam ter pelo menos uma opção ativa. Por favor, ative ou adicione opções para as seguintes seleções:\n\n' +
          invalidSelections.map(s => s.name || 'Seleção sem nome').join('\n')
        );
        return;
      }

      // Converter preço para número (de centavos para reais)
      let price = parseFloat(unformatPrice(newProduct.price)) / 100;

      // Processar variações - apenas se o usuário adicionar explicitamente
      let variations: ProductVariation[] = [];
      
      // Só criar a estrutura de variações se houver variações reais (não invisíveis)
      // Filtra para remover qualquer variação com nome "Padrão" (caso exista)
      const userVariations = newProduct.variations.filter(v => v.name !== "Padrão");
      
      if (userVariations.length > 0) {
        variations = [
          {
            name: "Tamanho", // Nome da variação (grupo)
            minRequired: 1,
            options: userVariations.map(variation => ({
              name: variation.name,
              price: parseFloat(unformatPrice(variation.price || '0')) / 100,
            }))
          }
        ];
        
        // Usa o preço da primeira variação real como preço base
        if (variations[0].options.length > 0) {
          price = variations[0].options[0].price || price;
        }
      }

      // Processar seleções obrigatórias
      const requiredSelections = newProduct.requiredSelections.map(selection => ({
        name: selection.name,
        minRequired: selection.minRequired,
        maxRequired: selection.maxRequired,
        options: selection.options.map(option => ({
          name: option.name,
          isActive: option.isActive !== false,
          price: option.price ? parseFloat(unformatPrice(option.price)) / 100 : 0
        }))
      }));

      // Conteúdo do documento do produto
      const productData: Omit<Product, 'id' | 'image'> = {
        name: newProduct.name,
        description: newProduct.description,
        price,
        category: newProduct.category,
        categoryId: newProduct.categoryId,
        isActive: newProduct.isActive,
        isPromotion: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        sellerId: user.uid,
        variations,
        requiredSelections,
        extras: newProduct.extras,
      };

      let productId: string;
      let imageUrl: string | undefined = undefined;

      if (isEditing && editingProduct) {
        // Caso de edição
        productId = editingProduct.id;
        
        // Se houver nova imagem, faz o upload
        if (newProduct.image && newProduct.image !== editingProduct.image) {
          imageUrl = await uploadProductImage(newProduct.image, productId);
        }

        const productRef = doc(db, 'partners', user.uid, 'products', productId);
        
        // Atualiza o documento no Firestore
        await updateDoc(productRef, {
          ...productData,
          ...(imageUrl && { image: imageUrl }),
          updatedAt: new Date()
        });

        // Fecha o modal e mostra mensagem de sucesso
        handleCloseModal();
        
        // Recarrega os produtos para garantir que tudo esteja atualizado
        await loadProducts(true); // Force reload para atualizar dados
        
        Alert.alert('Sucesso', 'Produto atualizado com sucesso!');
        
      } else {
        // Caso de criação
        const productRef = doc(collection(db, 'partners', user.uid, 'products'));
        productId = productRef.id;

        // Faz upload da imagem se existir
        if (newProduct.image) {
          imageUrl = await uploadProductImage(newProduct.image, productId);
        }

        const newProductData: Product = {
          ...productData,
          id: productId,
          ...(imageUrl && { image: imageUrl })
        };

        // Salva o novo produto no Firestore
        await setDoc(productRef, newProductData);

        // Fecha o modal e mostra mensagem de sucesso
        handleCloseModal();
        
        // Recarrega os produtos para garantir que tudo esteja atualizado
        await loadProducts(true); // Force reload para atualizar dados
        
        Alert.alert('Sucesso', 'Produto criado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      Alert.alert('Erro', 'Erro ao salvar produto');
    } finally {
      setLoading(false);
    }
  };

  const addVariation = () => {
    setNewProduct(prev => ({
      ...prev,
      variations: [...prev.variations, {
        name: '',
        price: '0,00',
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
      if (!categoryName.trim()) {
        Alert.alert('Erro', 'Informe um nome para a categoria');
        return '';
      }

      const trimmedName = categoryName.trim();
      const formattedName = trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1);
      // Verifica se a categoria já existe
      const existingCategory = availableCategories.find(
        cat => cat.name.toLowerCase() === formattedName.toLowerCase()
      );
      
      if (existingCategory) {
        return existingCategory.id;
      }

      // Usa o serviço de categorias para criar uma categoria personalizada
      const newCategory = await categoryService.createPartnerCategory(formattedName);
      
      // Atualiza a lista de categorias
      setAvailableCategories([...availableCategories, newCategory]);
      
      return newCategory.id;
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      Alert.alert('Erro', 'Não foi possível criar a categoria. Verifique suas permissões.');
      return '';
    }
  };


  const safeStringCompare = (text: string | undefined | null, search: string | undefined | null): boolean => {
    if (!text || !search) return true;
    return text.toLowerCase().includes(search.toLowerCase());
  };

  const calculatePromotionalPrice = (product: Product) => {
    if (!product.isPromotion || !product.promotion) return product.price;
    
    const { discountType, discountValue } = product.promotion;
    if (discountType === 'percentage') {
      return product.price * (1 - discountValue / 100);
    } else {
      return product.price - discountValue;
    }
  };

  const getFilteredProducts = useMemo(() => {
    return (categoryId: string | null) => {
      const cacheKey = `${categoryId || 'all'}_${searchText}`;
      
      // Verifica se já existe no cache
      if (productsCacheRef.current.has(cacheKey)) {
        return productsCacheRef.current.get(cacheKey)!;
      }
      
      let filtered = [];
      
      // Se for a categoria de promoções, filtra apenas produtos em promoção
      if (categoryId === 'promotions') {
        filtered = categories
          .flatMap(category => category.products)
          .filter(product => product.isPromotion === true);
      } 
      // Senão, filtra pela categoria selecionada
      else if (categoryId) {
        const category = categories.find(cat => cat.id === categoryId);
        filtered = category ? [...category.products] : [];
      } 
      // Se não tiver categoria selecionada, mostra todos
      else {
        filtered = categories.flatMap(category => [...category.products]);
      }
      
      // Aplica o filtro de pesquisa de texto se houver
      if (searchText.trim()) {
        filtered = filtered.filter(product => 
          safeStringCompare(product.name, searchText) || 
          safeStringCompare(product.description, searchText)
        );
      }
      
      // Armazena no cache
      productsCacheRef.current.set(cacheKey, filtered);
      
      return filtered;
    };
  }, [categories, searchText]);

  const filteredCategories = categories.map(category => ({
    ...category,
    products: category.products.filter(product => 
      safeStringCompare(product.name, searchText)
    ).map(product => ({
      ...product,
      promotionalPrice: product.isPromotion ? calculatePromotionalPrice(product) : undefined
    }))
  })).filter(category => category.products.length > 0);

  const displayCategories = selectedCategory === 'promotions' 
    ? filteredCategories.map(category => ({
        ...category,
        products: category.products.filter(product => product.isPromotion)
      }))
    : selectedCategory 
      ? filteredCategories.filter(category => category.id === selectedCategory)
      : filteredCategories;

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
        loadProducts(true); // Force reload para atualizar dados

        Alert.alert(
          'Plano Alterado',
          `Seu plano atual permite apenas ${limits.maxProducts} produtos ativos. Os produtos excedentes foram desativados automaticamente.`,
          [
                    {
          text: 'Upgrade',
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
      loadProducts(true); // Force reload para atualizar dados
      
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

  const handleTogglePromotion = async (product: Product) => {
    if (!isPremium) {
      Alert.alert(
        'Funcionalidade Premium',
        'A funcionalidade de promoções está disponível apenas para assinantes premium.',
        [
                  {
          text: 'Upgrade',
          onPress: handleUpgrade,
        },
          {
            text: 'Cancelar',
            style: 'cancel',
          },
        ]
      );
      return;
    }

    setSelectedProductForPromotion(product);
    setIsPromotionModalVisible(true);
  };

  const handleToggleOptionAvailability = async (product: Product, selectionIndex: number, optionIndex: number) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Cria uma cópia do produto para modificar
      const updatedProduct = { ...product };
      const selection = updatedProduct.requiredSelections[selectionIndex];
      
      if (selection && selection.options[optionIndex]) {
        // Verifica se está tentando desativar a última opção ativa
        const activeOptionsCount = selection.options.filter(option => option.isActive !== false).length;
        const isCurrentlyActive = selection.options[optionIndex].isActive !== false;
        
        if (isCurrentlyActive && activeOptionsCount <= 1) {
          Alert.alert(
            'Ação não permitida',
            'Não é possível desativar a última opção ativa de uma seleção obrigatória. Pelo menos uma opção deve permanecer ativa.',
            [{ text: 'OK', style: 'default' }]
          );
          return;
        }

        // Alterna o status da opção
        const currentStatus = selection.options[optionIndex].isActive;
        selection.options[optionIndex].isActive = currentStatus === false ? true : false;

        // Atualiza o produto no Firestore
        const productRef = doc(db, 'partners', user.uid, 'products', product.id);
        await updateDoc(productRef, {
          requiredSelections: updatedProduct.requiredSelections,
          updatedAt: new Date()
        });

        // Recarrega a lista de produtos
        await loadProducts(true); // Force reload para atualizar dados
        
        Alert.alert(
          'Sucesso', 
          `Opção "${selection.options[optionIndex].name}" ${selection.options[optionIndex].isActive ? 'ativada' : 'desativada'} com sucesso!`
        );
      }
    } catch (error) {
      console.error('Erro ao atualizar opção:', error);
      Alert.alert('Erro', 'Não foi possível atualizar a opção');
    }
  };

  const handleSavePromotion = async (promotion: Promotion) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const productRef = doc(db, 'partners', user.uid, 'products', promotion.productId);
      await updateDoc(productRef, {
        isPromotion: true,
        promotion,
        updatedAt: new Date()
      });

      setIsPromotionModalVisible(false);
      setSelectedProductForPromotion(null);
      
      // Recarrega a lista de produtos
      await loadProducts(true); // Force reload para atualizar dados
      
      Alert.alert('Sucesso', 'Promoção adicionada com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar promoção:', error);
      Alert.alert('Erro', 'Não foi possível salvar a promoção');
    }
  };

  const handleRemovePromotion = async (product: Product) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      Alert.alert(
        'Remover Promoção',
        'Tem certeza que deseja remover a promoção deste produto?',
        [
          {
            text: 'Cancelar',
            style: 'cancel'
          },
          {
            text: 'Remover',
            style: 'destructive',
            onPress: async () => {
              try {
                setLoading(true);
                const productRef = doc(db, 'partners', user.uid, 'products', product.id);
                
                // Atualiza o produto no banco de dados
                await updateDoc(productRef, {
                  isPromotion: false,
                  promotion: null,
                  updatedAt: new Date()
                });
                
                // Recarrega a lista de produtos
                await loadProducts(true); // Force reload para atualizar dados
                
                setLoading(false);
                Alert.alert('Sucesso', 'Promoção removida com sucesso!');
              } catch (error) {
                setLoading(false);
                console.error('Erro ao remover promoção:', error);
                Alert.alert('Erro', 'Não foi possível remover a promoção');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Erro ao remover promoção:', error);
      Alert.alert('Erro', 'Não foi possível remover a promoção');
    }
  };

  // Prepara as categorias para o TabView
  const productsInPromotion = categories.flatMap(category => 
    category.products.filter(product => product.isPromotion === true)
  );
  
  // Se não há categorias com produtos, mas há categorias disponíveis, cria uma categoria vazia
  let allCategories: Array<{ id: string; name: string; products?: Product[] }> = [];
  
  if (categories.length === 0) {
    // Se não há produtos, mostra pelo menos uma categoria disponível para permitir adicionar produtos
    const firstCategory = availableCategories.find(cat => cat.id !== 'promotions');
    if (firstCategory) {
      allCategories = [firstCategory];
    } else if (availableCategories.length > 0) {
      // Se não encontrar categoria que não seja promoção, usa a primeira disponível
      allCategories = [availableCategories[0]];
    }
  } else {
    // Lógica normal: inclui promoções se houver produtos em promoção + todas as categorias com produtos
    allCategories = [
      ...(productsInPromotion.length > 0 ? [{ id: 'promotions', name: 'Promoção' }] : []),
      ...categories
    ];
  }

  // Renderiza o conteúdo de cada aba
  const renderTabContent = useCallback((categoryId: string) => {
    const filteredProducts = getFilteredProducts(categoryId);
    
    // Verifica se há produtos para renderizar
    if (!filteredProducts || filteredProducts.length === 0) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 16, color: '#666', textAlign: 'center' }}>
            Nenhum produto encontrado nesta categoria
          </Text>
        </View>
      );
    }
    
    return (
      <CategoryProductsView
        products={filteredProducts}
        onProductPress={handleProductPress}
        onEditProduct={handleEditProduct}
        onToggleAvailability={toggleProductAvailability}
        onDeleteProduct={handleDeleteProduct}
        onTogglePromotion={categoryId === 'promotions' 
          ? handleRemovePromotion
          : handleTogglePromotion}
        isPremium={isPremium}
        defaultImage={defaultProductImage}
        shouldLoadImages={shouldLoadImagesForCategory(categoryId)}
      />
    );
  }, [getFilteredProducts, handleProductPress, handleEditProduct, toggleProductAvailability, handleDeleteProduct, handleRemovePromotion, handleTogglePromotion, isPremium, defaultProductImage, shouldLoadImagesForCategory]);

  // Manipula a mudança de categoria
  const handleCategoryChange = (index: number) => {
    const categoryId = allCategories[index]?.id;
    if (categoryId) {
      setActiveCategory(categoryId);
    }
  };

  // Se ainda está carregando e não há dados, mostra o loading
  if (loading && categories.length === 0 && availableCategories.length === 0) {
    return <LoadingSpinner />;
  }

  // Se não há categorias disponíveis, mostra estado vazio
  if (availableCategories.length === 0 && categories.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {allCategories.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            Nenhum produto cadastrado
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddProduct}
          >
            <Text style={styles.addButtonText}>Adicionar Produto</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.tabContainer}>
          <CategoryTabView 
            key={`tabview-${allCategories.length}-${activeCategory}`}
            categories={allCategories}
            renderScene={renderTabContent}
            onIndexChange={handleCategoryChange}
            initialIndex={Math.max(0, allCategories.findIndex(cat => cat.id === activeCategory))}
          />
          
          <TouchableOpacity 
            style={styles.floatingAddButton}
            onPress={handleAddProduct}
          >
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Modais */}
      <ProductDetailsModal 
        visible={isDetailsModalVisible}
        product={selectedProduct}
        onClose={() => setIsDetailsModalVisible(false)}
        onEdit={handleEditProduct}
        onToggleAvailability={toggleProductAvailability}
        onDelete={handleDeleteProduct}
        onTogglePromotion={isDetailsModalVisible && selectedProduct?.isPromotion 
          ? handleRemovePromotion 
          : handleTogglePromotion}
        onToggleOptionAvailability={handleToggleOptionAvailability}
        isPremium={isPremium}
        defaultImage={defaultProductImage}
      />

      <PromotionModal
        visible={isPromotionModalVisible}
        onClose={() => setIsPromotionModalVisible(false)}
        onSave={handleSavePromotion}
        product={selectedProductForPromotion}
      />

      {/* Modal de Adicionar/Editar Produto */}
      {isModalVisible && (
        <ProductFormModal 
          visible={isModalVisible}
          isEditing={isEditing}
          newProduct={newProduct}
          editingProduct={editingProduct || undefined}
          onClose={handleCloseModal}
          onSave={handleCreateProduct}
          onUpdateProduct={(updates: any) => setNewProduct(prev => ({ ...prev, ...updates }))}
          onPickImage={pickImageAsync}
          formatPrice={formatPrice}
          unformatPrice={unformatPrice}
          addVariation={addVariation}
          removeVariation={removeVariation}
          addRequiredSelection={addRequiredSelection}
          removeRequiredSelection={removeRequiredSelection}
          addOptionToSelection={addOptionToSelection}
          removeOptionFromSelection={removeOptionFromSelection}
          addExtra={addExtra}
          removeExtra={removeExtra}
        />
      )}

      {/* Modal de aviso de limite */}
      <LimitWarningModal
        visible={showLimitWarning}
        onClose={() => setShowLimitWarning(false)}
        onUpgrade={handleUpgrade}
        maxProducts={limits.maxProducts}
      />

      {/* Modal para gerenciar produtos ativos (downgrade) */}
      <Modal
        visible={showDowngradeModal}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowDowngradeModal(false)}
      >
        <View style={styles.downgradeModalContainer}>
          <View style={styles.downgradeModalContent}>
            <View style={styles.downgradeHeader}>
              <Text style={styles.downgradeTitle}>Selecione os produtos ativos</Text>
              <Text style={styles.downgradeDescription}>
                Seu plano permite até {limits.maxProducts} produtos ativos.
                Selecione quais produtos deseja manter ativos:
              </Text>
            </View>
            
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
                style={[styles.upgradeButton, { flex: 1 }]}
                onPress={handleUpgrade}
              >
                <Text style={styles.upgradeButtonText}>Upgrade</Text>
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
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  tabContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#FFA500',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  floatingAddButton: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFA500',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
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
  upgradeButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  downgradeModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    width: '100%',
    height: '100%',
  },
  downgradeModalContent: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  downgradeHeader: {
    marginBottom: 20,
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
    color: '#333',
    marginBottom: 20,
  },
  productSelectionList: {
    flex: 1,
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
  productStatusLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  downgradeModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  confirmSelectionButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFA500',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  confirmSelectionButtonEnabled: {
    backgroundColor: '#FFA500',
  },
  confirmSelectionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
