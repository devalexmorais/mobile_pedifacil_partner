import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Formik, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { CustomInput } from '../../../components/CustomInput';
import { TwilioService } from '../../../services/twilioService';
import { colors } from '../../../styles/theme/colors';

interface FormValues {
  phone: string;
  code: string;
}

const PhoneSchema = Yup.object().shape({
  phone: Yup.string()
    .required('Telefone é obrigatório')
    .test('valid-phone', 'Formato de telefone inválido', (value) => {
      if (!value) return false;
      return TwilioService.isValidPhoneNumber(value);
    }),
  code: Yup.string().when('$isVerifying', {
    is: true,
    then: (schema) => schema.required('Código é obrigatório').length(6, 'Código deve ter 6 dígitos'),
  }),
});

export default function Phone() {
  const router = useRouter();
  const rawParams = useLocalSearchParams();
  const [isVerifying, setIsVerifying] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // Memoize params to prevent unnecessary re-renders
  const params = useMemo(() => rawParams, [JSON.stringify(rawParams)]);

  const handleSubmit = async (
    values: FormValues, 
    { setSubmitting }: FormikHelpers<FormValues>
  ) => {
    try {
      if (!isVerifying) {
        // Etapa 1: Enviar código de verificação (método direto temporário)
        
        const response = await TwilioService.sendVerificationCodeDirect(values.phone);
        
        if (response.success) {
          setPhoneNumber(values.phone);
          setIsVerifying(true);
          
          Alert.alert(
            'Código Enviado', 
            `Um código de verificação foi enviado para ${TwilioService.formatPhoneDisplay(values.phone)}.`
          );
        } else {
          throw new Error('Falha ao enviar código de verificação');
        }
      } else {
        // Etapa 2: Verificar código (método direto temporário)
        const response = await TwilioService.verifyCodeDirect(phoneNumber, values.code);
        
        if (response.success && response.valid) {
          
          const formattedPhone = phoneNumber.replace(/\D/g, '');
          router.push({
            pathname: '/public/register/address',
            params: { ...params, phone: formattedPhone },
          });
        } else {
          Alert.alert('Código Inválido', response.message || 'O código digitado está incorreto.');
        }
      }
    } catch (error: any) {
      console.error('Erro no handleSubmit:', error);
      
      // Tratamento específico de erros
      let errorMessage = 'Ocorreu um erro. Tente novamente.';
      
      if (error.message.includes('Número de telefone inválido')) {
        errorMessage = 'Número de telefone inválido. Verifique o formato.';
      } else if (error.message.includes('Muitas tentativas')) {
        errorMessage = 'Muitas tentativas de verificação. Aguarde alguns minutos e tente novamente.';
      } else if (error.message.includes('expirado')) {
        errorMessage = 'Código expirado. Solicite um novo código.';
      } else if (error.message.includes('Código de verificação inválido')) {
        errorMessage = 'Código inválido. Verifique se digitou corretamente.';
      }
      
      Alert.alert('Erro', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    try {
      const response = await TwilioService.sendVerificationCodeDirect(phoneNumber);
      
      if (response.success) {
        Alert.alert(
          'Código Reenviado', 
          `Um novo código de verificação foi enviado para ${TwilioService.formatPhoneDisplay(phoneNumber)}.`
        );
      } else {
        throw new Error('Falha ao reenviar código');
      }
    } catch (error: any) {
      console.error('Erro ao reenviar código:', error);
      Alert.alert('Erro', 'Não foi possível reenviar o código. Tente novamente.');
    }
  };

  const formatPhoneInput = (text: string) => {
    // Remove todos os caracteres não numéricos
    const digits = text.replace(/\D/g, '');
    
    // Formatar para (11) 99999-9999
    if (digits.length <= 2) {
      return `(${digits}`;
    } else if (digits.length <= 7) {
      return `(${digits.substring(0, 2)}) ${digits.substring(2)}`;
    } else if (digits.length <= 11) {
      return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
    } else {
      // Limita a 11 dígitos
      const truncated = digits.substring(0, 11);
      return `(${truncated.substring(0, 2)}) ${truncated.substring(2, 7)}-${truncated.substring(7)}`;
    }
  };



  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Seu Telefone</Text>
        <Text style={styles.subtitle}>
          {isVerifying ? 'Digite o código enviado por SMS' : 'Digite seu número de telefone'}
        </Text>

        <Formik
          initialValues={{ phone: '', code: '' }}
          validationSchema={PhoneSchema}
          onSubmit={handleSubmit}
          context={{ isVerifying }}
        >
          {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting, setFieldValue }) => (
            <View>
              {!isVerifying ? (
                <>
                  <CustomInput
                    label="Telefone"
                    value={values.phone}
                    onChangeText={(text) => {
                      const formatted = formatPhoneInput(text);
                      setFieldValue('phone', formatted);
                    }}
                    onBlur={handleBlur('phone')}
                    keyboardType="phone-pad"
                    placeholder="(11) 99999-9999"
                    maxLength={15} // (11) 99999-9999
                  />
                  {touched.phone && errors.phone && (
                    <Text style={styles.errorText}>{errors.phone}</Text>
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.phoneDisplay}>
                    Código enviado para: {TwilioService.formatPhoneDisplay(phoneNumber)}
                  </Text>
                  <CustomInput
                    label="Código de Verificação"
                    value={values.code}
                    onChangeText={(text) => {
                      // Permite apenas números e limita a 6 dígitos
                      const digits = text.replace(/\D/g, '').substring(0, 6);
                      handleChange('code')(digits);
                    }}
                    onBlur={handleBlur('code')}
                    keyboardType="numeric"
                    placeholder="Digite o código de 6 dígitos"
                    maxLength={6}
                  />
                  {touched.code && errors.code && (
                    <Text style={styles.errorText}>{errors.code}</Text>
                  )}
                </>
              )}

              <TouchableOpacity
                style={[styles.button, isSubmitting && styles.buttonDisabled]}
                onPress={() => handleSubmit()}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>
                    {isVerifying ? 'Verificar Código' : 'Enviar Código'}
                  </Text>
                )}
              </TouchableOpacity>

              {isVerifying && (
                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleResendCode}
                >
                  <Text style={styles.resendButtonText}>Reenviar Código</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.backButton}
                onPress={() => (isVerifying ? setIsVerifying(false) : router.back())}
              >
                <Text style={styles.backButtonText}>
                  {isVerifying ? 'Voltar para Telefone' : 'Voltar'}
                </Text>
              </TouchableOpacity>


            </View>
          )}
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
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
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
  },
  resendButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  resendButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  phoneDisplay: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
});