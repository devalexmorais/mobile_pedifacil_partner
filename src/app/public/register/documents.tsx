import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  LogBox,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { useRegisterForm } from './context';
import { categoryService} from '../../../services/categoryService';
import { registerService } from '../../../services/registerService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Category {
  id: string;
  name: string;
}

interface Subcategory {
  id: string;
  name: string;
}

export default function Documents() {
  const router = useRouter();
  const { formData, updateFormData } = useRegisterForm();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [errors, setErrors] = useState({
    storeName: '',
    category: '',
    subcategory: '',
    document: '',
  });

  useEffect(() => {
    LogBox.ignoreLogs(['Possible Unhandled Promise Rejection']);
    LogBox.ignoreLogs(['VirtualizedLists should never be nested']);
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      console.log('Iniciando carregamento de categorias...');
      setLoading(true);
      const categoriesData = await categoryService.getCategories();
      console.log('Categorias carregadas com sucesso:', categoriesData);
      setCategories(categoriesData);
      
      if (categoriesData.length === 0) {
        Alert.alert(
          'Atenção',
          'Não encontramos nenhuma categoria cadastrada. Entre em contato com o suporte.'
        );
      }
    } catch (error: any) {
      console.error('Erro detalhado ao carregar categorias:', error);
      Alert.alert(
        'Erro ao carregar categorias',
        error.message || 'Não foi possível carregar as categorias. Tente novamente mais tarde.'
      );
    } finally {
      setLoading(false);
    }
  };

  const loadSubcategories = async (categoryId: string) => {
    try {
      setLoading(true);
      const subcategoriesData = await categoryService.getSubcategories(categoryId);
      setSubcategories(subcategoriesData);
      
      // Limpa a subcategoria selecionada quando muda de categoria
      updateFormData({ subcategory: '' });
      
      if (subcategoriesData.length === 0) {
        Alert.alert(
          'Atenção',
          'Não encontramos subcategorias para esta categoria.'
        );
      }
    } catch (error: any) {
      console.error('Erro ao carregar subcategorias:', error);
      Alert.alert(
        'Erro',
        'Não foi possível carregar as subcategorias. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDocument = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const isCPF = numbers.length <= 11;
    return numbers.substring(0, isCPF ? 11 : 14);
  };

  const validateDocument = (document: string) => {
    const numbers = document.replace(/\D/g, '');
    if (numbers.length !== 11 && numbers.length !== 14) {
      return 'Digite um CPF ou CNPJ válido';
    }
    return '';
  };

  const validate = () => {
    const newErrors = {
      storeName: '',
      category: '',
      subcategory: '',
      document: '',
    };

    let isValid = true;

    if (!formData.storeName?.trim()) {
      newErrors.storeName = 'Nome do estabelecimento é obrigatório';
      isValid = false;
    }
    
    if (!formData.category?.trim()) {
      newErrors.category = 'Categoria é obrigatória';
      isValid = false;
    }

    if (!formData.subcategory?.trim()) {
      newErrors.subcategory = 'Subcategoria é obrigatória';
      isValid = false;
    }

    if (!formData.cnpj_or_cpf) {
      newErrors.document = 'CPF ou CNPJ é obrigatório';
      isValid = false;
    } else {
      const documentError = validateDocument(formData.cnpj_or_cpf);
      if (documentError) {
        newErrors.document = documentError;
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleNext = async () => {
    if (!validate()) return;

    try {
      setLoading(true);

      // Verificar se todos os dados necessários estão presentes
      if (!formData.email || !formData.password || !formData.name || !formData.phone) {
        throw new Error('Dados pessoais incompletos. Por favor, volte e preencha todos os campos.');
      }

      if (!formData.street || !formData.number || !formData.neighborhood || !formData.city || !formData.state) {
        throw new Error('Dados de endereço incompletos. Por favor, volte e preencha todos os campos.');
      }

      // Tentar cadastrar o usuário
      const result = await registerService.registerPartner({
        ...formData,
        email: formData.email,
        password: formData.password,
        name: formData.name,
        phone: formData.phone,
        street: formData.street,
        number: formData.number,
        neighborhood: formData.neighborhood,
        city: formData.city,
        state: formData.state,
        storeName: formData.storeName,
        category: formData.category,
        subcategory: formData.subcategory,
        cnpj_or_cpf: formData.cnpj_or_cpf
      });

      console.log('Usuário registrado com sucesso:', result);

      Alert.alert(
        'Sucesso!',
        'Cadastro realizado com sucesso! Aguarde a aprovação do seu cadastro.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(auth)/(tabs)/pedidos')
          }
        ]
      );

    } catch (error: any) {
      console.error('Erro no processo de cadastro:', error);
      Alert.alert(
        'Erro no Cadastro',
        error.message || 'Não foi possível realizar o cadastro. Tente novamente.',
        [
          { 
            text: 'OK',
            style: 'cancel'
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Documentos</Text>
        <Text style={styles.subtitle}>Informe os dados do seu estabelecimento</Text>

        <View style={styles.form}>
          {/* Nome do Estabelecimento */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nome do Estabelecimento *</Text>
            <TextInput
              style={[styles.input, errors.storeName ? styles.inputError : null]}
              placeholder="Digite o nome do seu estabelecimento"
              value={formData.storeName}
              onChangeText={(text) => updateFormData({ storeName: text })}
              placeholderTextColor="#999"
            />
            {errors.storeName ? <Text style={styles.errorText}>{errors.storeName}</Text> : null}
          </View>

          {/* Categoria */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Categoria *</Text>
            <View style={[styles.pickerContainer, errors.category ? styles.inputError : null]}>
              <Picker
                selectedValue={formData.category}
                onValueChange={(itemValue) => {
                  updateFormData({ category: itemValue });
                  if (itemValue) {
                    loadSubcategories(itemValue);
                  }
                }}
                style={styles.picker}
              >
                <Picker.Item label="Selecione uma categoria" value="" />
                {categories.map((category) => (
                  <Picker.Item key={category.id} label={category.name} value={category.id} />
                ))}
              </Picker>
            </View>
            {errors.category ? <Text style={styles.errorText}>{errors.category}</Text> : null}
          </View>

          {/* Subcategoria */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Subcategoria *</Text>
            <View style={[styles.pickerContainer, errors.subcategory ? styles.inputError : null]}>
              <Picker
                selectedValue={formData.subcategory}
                onValueChange={(itemValue) => {
                  updateFormData({ subcategory: itemValue });
                }}
                style={styles.picker}
                enabled={!!formData.category}
              >
                <Picker.Item label="Selecione uma subcategoria" value="" />
                {subcategories.map((subcategory) => (
                  <Picker.Item 
                    key={subcategory.id} 
                    label={subcategory.name} 
                    value={subcategory.id} 
                  />
                ))}
              </Picker>
            </View>
            {errors.subcategory ? <Text style={styles.errorText}>{errors.subcategory}</Text> : null}
          </View>

          {/* CPF ou CNPJ */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>CPF ou CNPJ *</Text>
            <TextInput
              style={[styles.input, errors.document ? styles.inputError : null]}
              placeholder="Digite apenas números"
              value={formData.cnpj_or_cpf}
              onChangeText={(text) => updateFormData({ cnpj_or_cpf: formatDocument(text) })}
              keyboardType="numeric"
              maxLength={14}
            />
            {errors.document ? <Text style={styles.errorText}>{errors.document}</Text> : null}
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.nextButton, loading ? styles.buttonDisabled : null]} 
            onPress={handleNext}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.nextButtonText}>Cadastrar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#333',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginTop: 4,
  },
  picker: {
    height: 50,
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 14,
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    marginRight: 8,
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    marginLeft: 8,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    textAlign: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    textAlign: 'center',
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  imageUploadButton: {
    height: 150,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  imageUploadText: {
    color: '#666',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
  },
});