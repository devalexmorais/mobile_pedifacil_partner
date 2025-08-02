import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { CustomInput } from '../components/CustomInput';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { colors } from '@/styles/theme/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pushNotificationService } from '../services/pushNotificationService';
import { notificationService } from '../services/notificationService';

// Esquema de validação
const LoginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Email inválido')
    .required('Email é obrigatório')
    .test('email-touched', '', function() {
      return true; // Permite que o campo fique vazio inicialmente
    }),
  password: Yup.string()
    .required('Senha é obrigatória')
    .min(6, 'A senha deve ter pelo menos 6 caracteres')
});

export default function Index() {
  const router = useRouter();

  // Inicializar notificações push logo no carregamento do aplicativo
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        // Configurar notificações locais com Expo
        await notificationService.setupPushNotifications();
        
        // Configurar notificações FCM para segundo plano
        await pushNotificationService.requestUserPermission();
      } catch (error) {
        console.error('Erro ao inicializar notificações:', error);
      }
    };
    
    initializeNotifications();
  }, []);

  const handleSignIn = async (values: { email: string; password: string }, { setErrors }: { setErrors: (errors: any) => void }) => {
    try {
      // Primeiro verifica se é um parceiro
      const db = getFirestore();
      const partnersRef = collection(db, 'partners');
      const q = query(partnersRef, where('email', '==', values.email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setErrors({ email: 'Email não cadastrado. Que tal se tornar nosso parceiro?' });
        return;
      }

      // Se for um parceiro, procede com o login
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      
      // Obter e salvar o token
      const token = await userCredential.user.getIdToken();
      await AsyncStorage.setItem('@auth_token', token);
      
      // Salvar dados do usuário
      const userData = {
        id: userCredential.user.uid,
        email: userCredential.user.email,
        ...querySnapshot.docs[0].data()
      };
      await AsyncStorage.setItem('@user_data', JSON.stringify(userData));

      // Obter e salvar token FCM após login bem-sucedido
      try {
        await pushNotificationService.getFCMToken();
      } catch (fcmError) {
        console.error('Erro ao obter token FCM:', fcmError);
        // Não impede o login em caso de erro no FCM
      }

      router.replace('/(auth)/(tabs)/pedidos');
    } catch (error: any) {
      switch (error.code) {
        case 'auth/wrong-password':
        case 'auth/user-not-found':
        case 'auth/invalid-credential':
          setErrors({ password: 'Email ou senha incorreta' });
          break;
        case 'auth/invalid-email':
          setErrors({ email: 'Email inválido' });
          break;
        case 'auth/user-disabled':
          setErrors({ email: 'Este usuário está desativado' });
          break;
        case 'auth/too-many-requests':
          setErrors({ email: 'Muitas tentativas de login. Tente novamente mais tarde.' });
          break;
        default:
          setErrors({ email: error.message });
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.logoContainer}>
        <Image 
          source={require('../assets/logoName.png')} 
          style={styles.logoImage} 
          resizeMode="contain"
        />
      </View>

      <View style={styles.formContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Bem-vindo de volta!</Text>
          <Text style={styles.subtitle}>Entre com suas credenciais</Text>
        </View>
        
        <Formik
          initialValues={{ email: '', password: '' }}
          validationSchema={LoginSchema}
          validateOnChange={false}
          validateOnBlur={true}
          onSubmit={handleSignIn}
        >
          {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting }) => (
            <View style={styles.inputContainer}>
              <CustomInput
                label="Email"
                value={values.email}
                onChangeText={handleChange('email')}
                onBlur={handleBlur('email')}
                keyboardType="email-address"
                error={touched.email && !!errors.email}
              />
              {touched.email && errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

              <CustomInput
                label="Senha"
                value={values.password}
                onChangeText={handleChange('password')}
                onBlur={handleBlur('password')}
                secureTextEntry
                error={touched.password && !!errors.password}
              />
              {touched.password && errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

              <TouchableOpacity 
                style={styles.forgotPasswordButton}
                onPress={() => router.push('/public/forgot-password')}
              >
                <Text style={styles.forgotPasswordText}>
                  Esqueceu sua senha?
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.button, isSubmitting && styles.buttonDisabled]}
                onPress={handleSubmit as any}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Entrar</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.registerButton}
                onPress={() => router.push('/public/register/basic-info')}
              >
                <Text style={styles.registerButtonText}>
                  Novo por aqui? <Text style={styles.registerButtonTextBold}>Criar conta</Text>
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
    backgroundColor: '#fff',
  },
  logoContainer: {
    flex: 0.2,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
  },
  logoImage: {
    width: 200,
    height: 120,
  },
  formContainer: {
    flex: 0.8,
    paddingHorizontal: 30,
    paddingTop: 10,
    justifyContent: 'flex-start',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  inputContainer: {
    marginTop: 10,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: -12,
    marginBottom: 12,
    marginLeft: 4,
  },
  button: {
    backgroundColor: '#FFA500',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#FFA500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  registerButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#666',
    fontSize: 15,
  },
  registerButtonTextBold: {
    color: '#FFA500',
    fontWeight: '600',
  },
  forgotPasswordButton: {
    alignSelf: 'center',
    marginBottom: 20,
    marginTop: 5,
  },
  forgotPasswordText: {
    color: colors.text.secondary,
    fontSize: 14,
    textAlign: 'center',
  },
});