import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { CustomInput } from '../../../components/CustomInput';
import { colors } from '../../../styles/theme/colors';

const PhoneSchema = Yup.object().shape({
  phone: Yup.string()
    .required('Telefone é obrigatório')
    .min(11, 'Telefone inválido')
    .max(11, 'Telefone inválido'),
  code: Yup.string().when('$isVerifying', {
    is: true,
    then: (schema) => schema.required('Código é obrigatório').length(6, 'Código deve ter 6 dígitos'),
  }),
});

export default function Phone() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  const generateVerificationCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('Código gerado:', code);
    setVerificationCode(code);
    return code;
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    console.log('handleSubmit chamado com valores:', values);
    console.log('isVerifying:', isVerifying);
    
    try {
      if (!isVerifying) {
        console.log('Etapa 1: Enviando código...');
        generateVerificationCode();
        setIsVerifying(true);
        Alert.alert('Código Enviado', 'Verifique o console para o código.');
      } else {
        console.log('Etapa 2: Verificando código...');
        const inputCode = String(values.code).trim();
        const expectedCode = String(verificationCode).trim();

        console.log('Código digitado (inputCode):', inputCode);
        console.log('Código esperado (expectedCode):', expectedCode);
        console.log('Comparação (inputCode === expectedCode):', inputCode === expectedCode);

        if (inputCode === expectedCode) {
          console.log('Verificação bem-sucedida! Navegando para address...');
          const formattedPhone = values.phone.replace(/\D/g, '');
          router.push({
            pathname: '/public/register/address',
            params: { ...params, phone: formattedPhone },
          });
        } else {
          console.log('Código inválido.');
          Alert.alert('Código Inválido', 'O código digitado não corresponde ao enviado.');
        }
      }
    } catch (error) {
      console.error('Erro no handleSubmit:', error);
      Alert.alert('Erro', 'Ocorreu um erro. Tente novamente.');
    } finally {
      setSubmitting(false);
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
          {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting }) => (
            <View>
              {!isVerifying ? (
                <>
                  <CustomInput
                    label="Telefone"
                    value={values.phone}
                    onChangeText={(text) => {
                      console.log('Telefone digitado:', text);
                      handleChange('phone')(text);
                    }}
                    onBlur={handleBlur('phone')}
                    keyboardType="phone-pad"
                    placeholder="(11) 99999-9999"
                  />
                  {touched.phone && errors.phone && (
                    <Text style={styles.errorText}>{errors.phone}</Text>
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.phoneDisplay}>Código enviado para: {values.phone}</Text>
                  <CustomInput
                    label="Código de Verificação"
                    value={values.code}
                    onChangeText={(text) => {
                      console.log('Código digitado:', text);
                      handleChange('code')(text);
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
                onPress={() => {
                  console.log('Botão pressionado. Valores atuais:', values);
                  handleSubmit();
                }}
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
                  onPress={() => {
                    generateVerificationCode();
                    Alert.alert('Código Reenviado', 'Verifique o console.');
                  }}
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