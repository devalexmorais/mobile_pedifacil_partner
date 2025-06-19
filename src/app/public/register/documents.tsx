import React, { useState, useEffect, useMemo } from 'react';
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

// Função para capitalizar a primeira letra de cada palavra
const capitalizeWords = (s: string): string => s.replace(/\b\w/g, c => c.toUpperCase());

export default function Documents() {
  const router = useRouter();
  const rawParams = useLocalSearchParams();
  
  // Memoize params to prevent unnecessary re-renders
  const params = useMemo(() => rawParams, [JSON.stringify(rawParams)]);
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
      setLoading(true);
      const categoriesData = await categoryService.getCategories();
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

  const validateCPF = (cpf: string) => {
    // Passo 1: Remover caracteres não numéricos
    cpf = cpf.replace(/\D/g, '');
    
    // Verifica se tem 11 dígitos
    if (cpf.length !== 11) return false;
    
    // Passo 2: Verificar se todos os dígitos são iguais (inválido)
    if (/^(\d)\1+$/.test(cpf)) return false;
    
    // Passo 3: Calcular o primeiro dígito verificador
    // Multiplica os 9 primeiros dígitos pelos pesos de 10 a 2
    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    // Calcula o resto da divisão por 11
    let resto = soma % 11;
    // Se o resto for menor que 2, o dígito é 0; senão, subtrai-se de 11
    let dv1 = resto < 2 ? 0 : 11 - resto;
    
    // Verifica se o primeiro dígito verificador calculado é igual ao do CPF
    if (parseInt(cpf.charAt(9)) !== dv1) return false;
    
    // Passo 4: Calcular o segundo dígito verificador
    // Multiplica os 10 primeiros dígitos (9 iniciais + primeiro verificador) pelos pesos de 11 a 2
    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    // Calcula o resto da divisão por 11
    resto = soma % 11;
    // Se o resto for menor que 2, o dígito é 0; senão, subtrai-se de 11
    let dv2 = resto < 2 ? 0 : 11 - resto;
    
    // Verifica se o segundo dígito verificador calculado é igual ao do CPF
    if (parseInt(cpf.charAt(10)) !== dv2) return false;
    
    // CPF válido
    return true;
  };
  
  const validateCNPJ = (cnpj: string) => {
    // Passo 1: Remover caracteres não numéricos
    cnpj = cnpj.replace(/\D/g, '');
    
    // Verifica se tem 14 dígitos
    if (cnpj.length !== 14) return false;
    
    // Passo 2: Verificar se todos os dígitos são iguais (inválido)
    if (/^(\d)\1+$/.test(cnpj)) return false;
    
    // Passo 3: Calcular o primeiro dígito verificador
    // Aplica a sequência de pesos aos 12 primeiros dígitos
    let soma = 0;
    let peso = 2;
    
    // Iteração de trás para frente
    for (let i = 11; i >= 0; i--) {
      soma += parseInt(cnpj.charAt(i)) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }
    
    // Cálculo do dígito: se resto da divisão por 11 for 0 ou 1, o dígito é 0; senão, é 11 - resto
    let resto = soma % 11;
    let dv1 = resto < 2 ? 0 : 11 - resto;
    
    // Verifica se o primeiro dígito verificador calculado é igual ao do CNPJ
    if (parseInt(cnpj.charAt(12)) !== dv1) return false;
    
    // Passo 4: Calcular o segundo dígito verificador
    // Aplica a sequência de pesos aos 13 primeiros dígitos (12 iniciais + primeiro verificador)
    soma = 0;
    peso = 2;
    
    // Iteração de trás para frente
    for (let i = 12; i >= 0; i--) {
      soma += parseInt(cnpj.charAt(i)) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }
    
    // Cálculo do dígito: se resto da divisão por 11 for 0 ou 1, o dígito é 0; senão, é 11 - resto
    resto = soma % 11;
    let dv2 = resto < 2 ? 0 : 11 - resto;
    
    // Verifica se o segundo dígito verificador calculado é igual ao do CNPJ
    if (parseInt(cnpj.charAt(13)) !== dv2) return false;
    
    // CNPJ válido
    return true;
  };

  const validateDocument = (document: string) => {
    const numbers = document.replace(/\D/g, '');
    
    // Verifica se é CPF ou CNPJ pelo tamanho
    if (numbers.length === 11) {
      if (!validateCPF(numbers)) {
        return 'CPF inválido. Verifique os números digitados.';
      }
    } else if (numbers.length === 14) {
      if (!validateCNPJ(numbers)) {
        return 'CNPJ inválido. Verifique os números digitados.';
      }
    } else {
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



      // Verificação mais detalhada dos dados
      if (!params.name || !params.email || !params.password || 
          !params.phone || !params.street || !params.number || 
          !params.neighborhood || !params.city || !params.state ||
          !params.delivery || !params.pickup || !params.paymentOptions || !params.schedule) {
        Alert.alert('Erro', 'Dados de cadastro incompletos. Por favor, comece o cadastro novamente.');
        router.push('/public/register/basic-info');
        return;
      }

      try {
        // Adiciona um pequeno atraso para evitar múltiplas chamadas rápidas
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const result = await registerService.registerPartner({
          name: String(params.name),
          email: String(params.email),
          password: String(params.password),
          phone: String(params.phone),
          street: String(params.street),
          number: String(params.number),
          complement: params.complement ? String(params.complement) : '',
          neighborhood: String(params.neighborhood),
          neighborhoodName: params.neighborhoodName ? String(params.neighborhoodName) : '',
          city: String(params.city),
          cityName: params.cityName ? String(params.cityName) : '',
          zip_code: params.zip_code ? String(params.zip_code) : '',
          state: String(params.state),
          stateName: params.stateName ? String(params.stateName) : '',
          storeName: formData.storeName,
          category: formData.category,
          subcategory: formData.subcategory,
          cnpj_or_cpf: formData.cnpj_or_cpf,
          delivery: params.delivery ? String(params.delivery) : '',
          pickup: params.pickup ? String(params.pickup) : '',
          paymentOptions: params.paymentOptions ? String(params.paymentOptions) : '',
          schedule: params.schedule ? String(params.schedule) : '',
        });

        if ('error' in result) {
          throw new Error(String(result.error));
        }



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
      } catch (authError: any) {
        console.error('Erro específico no Firebase Auth:', authError);
        
        if (authError.code === 'auth/too-many-requests') {
          Alert.alert(
            'Limite de tentativas excedido',
            'Detectamos muitas tentativas de cadastro. Por favor, tente novamente mais tarde ou entre em contato com o suporte.',
            [
              {
                text: 'OK',
                onPress: () => router.push('/')
              }
            ]
          );
        } else {
          throw authError; // Repassa o erro para ser tratado no catch externo
        }
      }
      
    } catch (error: any) {
      console.error('Erro detalhado no cadastro:', error);
      
      // Mensagens de erro personalizadas
      let errorMessage = 'Não foi possível realizar o cadastro. Tente novamente.';
      
      if (error.message) {
        if (error.message.includes('too-many-requests')) {
          errorMessage = 'Muitas tentativas de cadastro. Por favor, aguarde alguns minutos e tente novamente mais tarde.';
        } else if (error.message.includes('email-already-in-use')) {
          errorMessage = 'Este e-mail já está cadastrado. Tente fazer login ou use outro e-mail.';
        } else if (error.message.includes('invalid-email')) {
          errorMessage = 'O e-mail informado é inválido. Verifique e tente novamente.';
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert(
        'Erro no Cadastro',
        errorMessage
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
            onChangeText={(text) => updateFormData({ storeName: capitalizeWords(text) })}
            autoCapitalize="words"
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