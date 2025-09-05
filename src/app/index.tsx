import React, { useEffect, useState } from 'react';
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
import { useAuth } from '../contexts/AuthContext';

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
  const { user, isAuthenticated, loading } = useAuth();
  const [isLoginBlocked, setIsLoginBlocked] = useState(false);
  const [blockTimeRemaining, setBlockTimeRemaining] = useState(0);

  // Verificar se o usuário já está autenticado
  useEffect(() => {
    const checkInitialAuth = async () => {
      if (!loading) {
        if (isAuthenticated && user) {
          // Usuário já está logado, redirecionar para pedidos
          console.log('Usuário autenticado, redirecionando para pedidos');
          router.replace('/(auth)/(tabs)/pedidos');
        } else if (!isAuthenticated && !user) {
          // Verificar se há token mas o Firebase ainda não carregou
          try {
            const token = await AsyncStorage.getItem('@auth_token');
            if (token) {
              // Se há token, aguardar mais tempo para o Firebase inicializar completamente
              console.log('Token encontrado, aguardando Firebase inicializar...');
              setTimeout(() => {
                if (isAuthenticated && user) {
                  console.log('Usuário autenticado após delay, redirecionando para pedidos');
                  router.replace('/(auth)/(tabs)/pedidos');
                }
              }, 2000); // Aumentado de 1000ms para 2000ms
            }
          } catch (error) {
            console.error('Erro ao verificar token:', error);
          }
        }
      }
    };

    checkInitialAuth();
  }, [isAuthenticated, user, loading]);

  // Monitorar mudanças no estado de autenticação
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      console.log('Estado de autenticação mudou, redirecionando para pedidos');
      router.replace('/(auth)/(tabs)/pedidos');
    }
  }, [isAuthenticated, user, loading]);

  // Verificar se o login está bloqueado e gerenciar contador
  useEffect(() => {
    const checkLoginBlock = async () => {
      try {
        const blockUntil = await AsyncStorage.getItem('@login_block_until');
        if (blockUntil) {
          const blockTime = parseInt(blockUntil);
          const now = Date.now();
          
          if (now < blockTime) {
            setIsLoginBlocked(true);
            const remaining = Math.ceil((blockTime - now) / 1000);
            setBlockTimeRemaining(remaining);
          } else {
            // Bloqueio expirou
            await AsyncStorage.removeItem('@login_block_until');
            setIsLoginBlocked(false);
            setBlockTimeRemaining(0);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar bloqueio de login:', error);
      }
    };

    checkLoginBlock();
  }, []);

  // Contador regressivo para o botão
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isLoginBlocked && blockTimeRemaining > 0) {
      interval = setInterval(() => {
        setBlockTimeRemaining(prev => {
          if (prev <= 1) {
            setIsLoginBlocked(false);
            AsyncStorage.removeItem('@login_block_until');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isLoginBlocked, blockTimeRemaining]);

  // Inicializar notificações push logo no carregamento do aplicativo
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        // Configurar notificações locais com Expo
        await notificationService.setupPushNotifications();
        
        // NÃO solicitar permissões automaticamente - apenas no login
        console.log('🔧 Notificações locais configuradas (sem solicitar permissões)');
      } catch (error) {
        console.error('Erro ao inicializar notificações:', error);
      }
    };
    
    initializeNotifications();
  }, []);

  // Se ainda está carregando, não renderizar nada (splash nativo já está visível)
  if (loading) {
    return null;
  }

  // Se já está autenticado, não renderizar nada (será redirecionado)
  if (isAuthenticated && user) {
    return null;
  }

  const handleSignIn = async (values: { email: string; password: string }, { setErrors }: { setErrors: (errors: any) => void }) => {
    // Verificar se o login está bloqueado
    if (isLoginBlocked) {
      const minutes = Math.floor(blockTimeRemaining / 60);
      const seconds = blockTimeRemaining % 60;
      setErrors({ email: `Muitas tentativas de login. Tente novamente em ${minutes}:${seconds.toString().padStart(2, '0')}` });
      return;
    }

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
          // Bloquear login por 5 minutos
          const blockUntil = Date.now() + (5 * 60 * 1000); // 5 minutos
          await AsyncStorage.setItem('@login_block_until', blockUntil.toString());
          setIsLoginBlocked(true);
          setBlockTimeRemaining(300); // 5 minutos em segundos
          setErrors({ email: 'Muitas tentativas de login. Tente novamente em 5:00' });
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
                style={[styles.button, (isSubmitting || isLoginBlocked) && styles.buttonDisabled]}
                onPress={handleSubmit as any}
                disabled={isSubmitting || isLoginBlocked}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>
                    {isLoginBlocked 
                      ? `Aguarde ${Math.floor(blockTimeRemaining / 60)}:${(blockTimeRemaining % 60).toString().padStart(2, '0')}`
                      : 'Entrar'
                    }
                  </Text>
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