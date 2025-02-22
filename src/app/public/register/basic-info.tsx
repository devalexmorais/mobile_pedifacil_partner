import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { ActivityIndicator } from 'react-native-paper';
import debounce from 'lodash/debounce';
import { partnerService } from '../../../services/partnerService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { CustomInput } from '../../../components/CustomInput';
import { colors } from '../../../styles/theme/colors';

interface BasicInfoFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const BasicInfoSchema = Yup.object().shape({
  name: Yup.string()
    .required('Nome é obrigatório')
    .min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: Yup.string()
    .email('Email inválido')
    .required('Email é obrigatório'),
  password: Yup.string()
    .required('Senha é obrigatória')
    .min(6, 'A senha deve ter pelo menos 6 caracteres'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'As senhas não conferem')
    .required('Confirmação de senha é obrigatória'),
});

export default function RegisterBasicInfo() {
  const router = useRouter();
  const auth = getAuth();
  const [formData, setFormData] = useState<BasicInfoFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof BasicInfoFormData, string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'exists' | 'available'>('idle');

  const updateFormData = (field: Partial<BasicInfoFormData>) => {
    setFormData(prev => ({ ...prev, ...field }));
  };

  const checkEmailExists = useCallback(
    debounce(async (email: string, setFieldError: (field: string, message: string | undefined) => void) => {     
      if (!email) return;
      
      setEmailStatus('checking');
      try {
        const exists = await partnerService.checkEmailExists(email);
        setEmailStatus(exists ? 'exists' : 'available');
        
        if (exists) {
          setFieldError('email', 'Este e-mail já está cadastrado');
        }
      } catch (error) {
        console.error('Erro ao verificar email:', error);
        setEmailStatus('idle');
        setFieldError('email', 'Erro ao verificar disponibilidade do email');
      }
    }, 500),
    []
  );

  const validateField = (field: keyof BasicInfoFormData, value: string) => {
    const validations: Record<string, Array<{ test: (v: string) => boolean; message: string }>> = {
      name: [
        { 
          test: (v: string) => v.trim().length > 0,
          message: 'Nome é obrigatório' 
        }
      ],
      email: [
        { 
          test: (v: string) => v.trim().length > 0,
          message: 'E-mail é obrigatório' 
        },
        { 
          test: (v: string) => /^\S+@\S+\.\S+$/.test(v),
          message: 'E-mail inválido' 
        }
      ],
      password: [
        { 
          test: (v: string) => v.length >= 6,
          message: 'Mínimo 6 caracteres' 
        },
        { 
          test: (v: string) => /(?=.*[A-Z])/.test(v),
          message: 'Necessita uma letra maiúscula' 
        },
        { 
          test: (v: string) => /(?=.*[0-9])/.test(v),
          message: 'Necessita um número' 
        }
      ],
      confirmPassword: [
        { 
          test: (v: string) => v === formData.password,
          message: 'Senhas não coincidem' 
        }
      ],
    };

    const fieldValidations = validations[field];
    const error = fieldValidations.find(val => !val.test(value))?.message;
    setErrors(prev => ({ ...prev, [field]: error }));
    return !error;
  };

  const validateForm = async () => {
    const fields: Array<keyof BasicInfoFormData> = ['name', 'email', 'password', 'confirmPassword'];
    const validations = fields.map(field => validateField(field, formData[field]));
    return validations.every(Boolean) && emailStatus !== 'exists';
  };

  const isFormValid = () => {
    // Verifica se há erros
    const hasErrors = Object.values(errors).some(error => !!error);
    // Verifica se todos os campos estão preenchidos
    const allFieldsFilled = Object.values(formData).every(value => !!value);
    // Verifica se o email está disponível
    const isEmailAvailable = emailStatus === 'available';
    // Verifica se não está carregando
    const notLoading = !isLoading && emailStatus !== 'checking';

    return !hasErrors && allFieldsFilled && isEmailAvailable && notLoading;
  };

  const handleNext = async () => {
    try {
      setIsLoading(true);
      const isValid = await validateForm();
      
      if (isValid && emailStatus === 'available') {
        router.push('/public/register/phone');
      }
    } catch (error) {
      console.error('Erro:', error);
      Alert.alert('Erro', 'Não foi possível prosseguir');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (values: any) => {
    // Só continua se o email estiver disponível
    if (emailStatus !== 'available') {
      Alert.alert('Erro', 'Por favor, verifique o email informado');
      return;
    }

    console.log('Dados sendo enviados do basic-info:', values);
    
    router.push({
      pathname: '/public/register/phone',
      params: {
        name: values.name,
        email: values.email,
        password: values.password
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Criar Conta</Text>
        <Text style={styles.subtitle}>Preencha seus dados básicos</Text>

        <Formik
          initialValues={{ name: '', email: '', password: '', confirmPassword: '' }}
          validationSchema={BasicInfoSchema}
          onSubmit={handleSubmit}
        >
          {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting, setFieldError }) => {
            // Verifica se o formulário está válido para habilitar o botão
            const isFormValid = 
              !errors.name && 
              !errors.email && 
              !errors.password && 
              !errors.confirmPassword && 
              values.name && 
              values.email && 
              values.password && 
              values.confirmPassword &&
              emailStatus === 'available';

            return (
              <View>
                <CustomInput
                  label="Nome completo"
                  value={values.name}
                  onChangeText={handleChange('name')}
                  onBlur={handleBlur('name')}
                  error={touched.name && !!errors.name}
                />
                {touched.name && errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

                <View>
                  <CustomInput
                    label="Email"
                    value={values.email}
                    onChangeText={(text) => {
                      handleChange('email')(text);
                      checkEmailExists(text, setFieldError);
                    }}
                    onBlur={handleBlur('email')}
                    keyboardType="email-address"
                    error={touched.email && !!errors.email}
                  />
                  {emailStatus === 'checking' && (
                    <ActivityIndicator 
                      size="small" 
                      color={colors.primary} 
                      style={styles.emailCheckIndicator}
                    />
                  )}
                  {touched.email && errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                </View>

                <CustomInput
                  label="Senha"
                  value={values.password}
                  onChangeText={handleChange('password')}
                  onBlur={handleBlur('password')}
                  secureTextEntry
                  error={touched.password && !!errors.password}
                />
                {touched.password && errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

                <CustomInput
                  label="Confirmar senha"
                  value={values.confirmPassword}
                  onChangeText={handleChange('confirmPassword')}
                  onBlur={handleBlur('confirmPassword')}
                  secureTextEntry
                  error={touched.confirmPassword && !!errors.confirmPassword}
                />
                {touched.confirmPassword && errors.confirmPassword && (
                  <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                )}

                <TouchableOpacity
                  style={[
                    styles.button, 
                    (!isFormValid || isSubmitting) && styles.buttonDisabled
                  ]}
                  onPress={handleSubmit as any}
                  disabled={!isFormValid || isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>
                      {emailStatus === 'exists' ? 'Email já cadastrado' : 'Continuar'}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => router.back()}
                >
                  <Text style={styles.backButtonText}>Voltar</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        </Formik>
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
  emailCheckIndicator: {
    position: 'absolute',
    right: 16,
    top: '30%',
  },
});