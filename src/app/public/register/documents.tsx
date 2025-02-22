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
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { categoryService} from '../../../services/categoryService';
import { registerService } from '../../../services/registerService';
import { CustomInput } from '../../../components/CustomInput';
import { colors } from '../../../styles/theme/colors';

interface Category {
  id: string;
  name: string;
}

interface Subcategory {
  id: string;
  name: string;
}

interface DocumentsFormData {
  storeName: string;
  category: string;
  subcategory: string;
  cnpj_or_cpf: string;
}

export default function Documents() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [formData, setFormData] = useState<DocumentsFormData>({
    storeName: '',
    category: '',
    subcategory: '',
    cnpj_or_cpf: ''
  });
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [errors, setErrors] = useState({
    storeName: '',
    category: '',
    subcategory: '',
    document: '',
  });

  const updateFormData = (field: Partial<DocumentsFormData>) => {
    setFormData(prev => ({
      ...prev,
      ...field
    }));
  };

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

      console.log('Parâmetros para registro:', params);

      // Verificação mais detalhada dos dados
      if (!params.name || !params.email || !params.password || 
          !params.phone || !params.street || !params.number || 
          !params.neighborhood || !params.city || !params.state) {
        Alert.alert('Erro', 'Dados de cadastro incompletos. Por favor, comece o cadastro novamente.');
        router.push('/public/register/basic-info');
        return;
      }

      const result = await registerService.registerPartner({
        name: String(params.name),
        email: String(params.email),
        password: String(params.password),
        phone: String(params.phone),
        street: String(params.street),
        number: String(params.number),
        complement: params.complement ? String(params.complement) : '',
        neighborhood: String(params.neighborhood),
        city: String(params.city),
        state: String(params.state),
        storeName: formData.storeName,
        category: formData.category,
        subcategory: formData.subcategory,
        cnpj_or_cpf: formData.cnpj_or_cpf,
      });

      if ('error' in result) {
        throw new Error(String(result.error));
      }

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
      Alert.alert(
        'Erro no Cadastro',
        error.message || 'Não foi possível realizar o cadastro. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };
  
  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Dados do Estabelecimento</Text>
        <Text style={styles.subtitle}>Complete as informações do seu negócio</Text>

        <View style={styles.form}>
          {/* Nome do Estabelecimento com CustomInput */}
          <CustomInput
            label="Nome do Estabelecimento"
            value={formData.storeName}
            onChangeText={(text) => updateFormData({ storeName: text })}
            error={!!errors.storeName}
            placeholder="Digite o nome do seu estabelecimento"
          />
          {errors.storeName ? <Text style={styles.errorText}>{errors.storeName}</Text> : null}
          
          {/* CPF/CNPJ com CustomInput */}
          <CustomInput
            label="CPF ou CNPJ"
            value={formData.cnpj_or_cpf}
            onChangeText={(text) => updateFormData({ cnpj_or_cpf: formatDocument(text) })}
            error={!!errors.document}
            keyboardType="numeric"
            maxLength={14}
            placeholder="Digite apenas números"
          />
          {errors.document ? <Text style={styles.errorText}>{errors.document}</Text> : null}

          {/* Categoria - mantendo o Picker */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Categoria</Text>
            <View style={[styles.pickerContainer, errors.category ? styles.pickerError : null]}>
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

          {/* Subcategoria - mantendo o Picker */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Subcategoria</Text>
            <View style={[styles.pickerContainer, errors.subcategory ? styles.pickerError : null]}>
              <Picker
                selectedValue={formData.subcategory}
                onValueChange={(itemValue) => updateFormData({ subcategory: itemValue })}
                style={styles.picker}
                enabled={!!formData.category}
              >
                <Picker.Item label="Selecione uma subcategoria" value="" />
                {subcategories.map((subcategory) => (
                  <Picker.Item key={subcategory.id} label={subcategory.name} value={subcategory.id} />
                ))}
              </Picker>
            </View>
            {errors.subcategory ? <Text style={styles.errorText}>{errors.subcategory}</Text> : null}
          </View>

        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Finalizar Cadastro</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
        >
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 30,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    backgroundColor: colors.inputBackground,
    height: 60,
    justifyContent: 'center',
  },
  pickerError: {
    borderColor: colors.text.error,
  },
  picker: {
    height: 50,
    color: colors.text.primary,
  },
  errorText: {
    color: colors.text.error,
    fontSize: 12,
    marginTop: -12,
    marginBottom: 12,
    marginLeft: 4,
  },
  button: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  backButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.text.secondary,
  },
  backButtonText: {
    color: colors.text.secondary,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});