import { useEffect, useState, useRef } from 'react';
import { notificationService } from './services/notificationService';
import { pushNotificationService } from './services/pushNotificationService';
import { Platform, Alert, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from './config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './config/firebase';
import messaging from '@react-native-firebase/messaging';

// Configurar handler para notificações em primeiro plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function App() {
  const [notificationsInitialized, setNotificationsInitialized] = useState(false);
  const responseListener = useRef<any>();

  // Função para obter e salvar token de notificação
  const saveNotificationToken = async (userId: string) => {
    try {
      console.log('🔔 Verificando token de notificação para usuário:', userId);
      
      // Verificar se já existe um token salvo no AsyncStorage
      const existingToken = await AsyncStorage.getItem('fcm_token');
      if (existingToken) {
        console.log('✅ Token já existe no AsyncStorage:', existingToken.substring(0, 20) + '...');
        // Verificar se o token do AsyncStorage é válido (mais de 100 caracteres)
        if (existingToken.length > 100) {
          console.log('✅ Token do AsyncStorage parece válido, usando ele');
          // Salvar o token existente no Firestore se necessário
          const userRef = doc(db, 'partners', userId);
          await setDoc(userRef, {
            fcmToken: existingToken,
            lastTokenUpdate: new Date(),
            tokenInvalid: false,
            requiresTokenRefresh: false,
            tokenInvalidAt: null,
          }, { merge: true });
          return;
        } else {
          console.log('⚠️ Token do AsyncStorage parece inválido, renovando...');
        }
      }
      
      console.log('📱 Token não encontrado no AsyncStorage, solicitando permissões...');
      
      // Solicitar permissões do Expo Notifications primeiro
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('❌ Permissão para notificações Expo negada');
        Alert.alert(
          'Permissão Negada',
          'Para receber notificações, você precisa permitir nas configurações do app.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      console.log('✅ Permissão para notificações concedida');
      
      // Obter token via Expo Notifications (gera token FCM válido)
      const token = await Notifications.getDevicePushTokenAsync();
      console.log('🔑 Token obtido:', token.data ? token.data.substring(0, 20) + '...' : 'Token vazio');
      
      if (!token || !token.data) {
        console.log('⚠️ Token vazio');
        return;
      }
      
      // Verificar se é um token FCM válido (deve ter mais de 100 caracteres)
      if (token.data.length < 100) {
        console.log('⚠️ Token pode não ser FCM válido, mas continuando...');
      }
      
      // Limpar o token removendo espaços e caracteres especiais
      const cleanToken = token.data.trim().replace(/[\s{}]/g, '');
      console.log('🧹 Token limpo:', cleanToken.substring(0, 20) + '...');
      console.log('📏 Comprimento do token limpo:', cleanToken.length, 'caracteres');
      
      // Salvar token no AsyncStorage como backup
      await AsyncStorage.setItem('fcm_token', cleanToken);
      await AsyncStorage.setItem('fcm_token_user', userId);
      await AsyncStorage.setItem('fcm_token_date', new Date().toISOString());
      
      // Salvar apenas FCM token no Firestore
      const userRef = doc(db, 'partners', userId);
      
      await setDoc(userRef, {
        fcmToken: cleanToken,
        lastTokenUpdate: new Date(),
        tokenInvalid: false,
        requiresTokenRefresh: false,
        tokenInvalidAt: null,
        // Remover campos antigos de tokens Expo se existirem
        notificationTokens: null,
        fcmTokens: null,
        deviceInfo: {
          lastUpdated: new Date(),
          platform: Platform.OS,
          version: Platform.Version,
          tokenType: 'device_push'
        }
      }, { merge: true });
      
      console.log('🔥 Token de notificação salvo no AsyncStorage e Firestore para parceiro:', userId);
      
      // Mostrar feedback de sucesso
      Alert.alert(
        '✅ Notificações Ativadas!',
        'Agora você receberá notificações sobre novos pedidos e atualizações importantes.',
        [{ text: 'Perfeito!' }]
      );
      
    } catch (error) {
      console.error('❌ Erro ao obter/salvar token de notificação:', error);
      Alert.alert(
        'Erro',
        'Ocorreu um erro ao configurar as notificações.',
        [{ text: 'OK' }]
      );
    }
  };

  // Inicializar configuração de notificações com sistema inteligente
  useEffect(() => {
    const initNotifications = async () => {
      try {
        console.log('🔧 Inicializando sistema inteligente de notificações...');
        
        // Solicitar permissões do FCM
        const authStatus = await messaging().requestPermission();
        const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                       authStatus === messaging.AuthorizationStatus.PROVISIONAL;
        
        if (!enabled) {
          console.log('❌ Permissão FCM negada');
          setNotificationsInitialized(true);
          return;
        }
        
        console.log('✅ Permissão FCM concedida');
        
        // Obter token FCM nativo
        const fcmToken = await messaging().getToken();
        console.log('🔑 Token FCM obtido:', fcmToken ? fcmToken.substring(0, 20) + '...' : 'Token vazio');
        
        if (fcmToken) {
          // Salvar token no AsyncStorage como backup
          await AsyncStorage.setItem('fcm_token', fcmToken);
          await AsyncStorage.setItem('fcm_token_date', new Date().toISOString());
          
          // Salvar no Firestore se usuário estiver autenticado
          const user = auth.currentUser;
          if (user) {
            const userRef = doc(db, 'partners', user.uid);
            await setDoc(userRef, {
              fcmToken: fcmToken,
              lastTokenUpdate: new Date(),
              tokenInvalid: false,
              requiresTokenRefresh: false,
              tokenInvalidAt: null,
            }, { merge: true });
            console.log('✅ Token FCM salvo no Firestore');
          }
        }
        
        // Inicializar sistema inteligente de notificações
        const unsubscribeNotifications = await notificationService.setupPushNotifications();
        
        // Configurar listener global para notificações clicadas
        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
          console.log('🔔 Notificação clicada - navegando para pedidos');
          setTimeout(() => {
            router.push('/(auth)/(tabs)/pedidos');
          }, 300);
        });
        
        // Configurar verificação de notificação inicial
        Notifications.getLastNotificationResponseAsync().then(response => {
          if (response) {
            console.log('🔔 App aberto por notificação - navegando para pedidos');
            setTimeout(() => {
              router.push('/(auth)/(tabs)/pedidos');
            }, 500);
          }
        });
        
        setNotificationsInitialized(true);
        console.log('✅ Sistema inteligente de notificações inicializado com sucesso');
        
        // Limpeza na desmontagem
        return () => {
          if (typeof unsubscribeNotifications === 'function') {
            unsubscribeNotifications();
          }
          Notifications.removeNotificationSubscription(responseListener.current);
        };
      } catch (error) {
        console.error('❌ Erro ao inicializar notificações:', error);
        setNotificationsInitialized(true); // Mesmo com erro, marcar como inicializado
      }
    };

    if (!notificationsInitialized) {
      initNotifications();
    }
  }, [notificationsInitialized]);

  // Monitorar mudanças de autenticação para salvar token FCM no login
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user && notificationsInitialized) {
        console.log('👤 Usuário autenticado - salvando token FCM no Firestore');
        
        // Obter token FCM atual
        try {
          const fcmToken = await messaging().getToken();
          if (fcmToken) {
            const userRef = doc(db, 'partners', user.uid);
            await setDoc(userRef, {
              fcmToken: fcmToken,
              lastTokenUpdate: new Date(),
              tokenInvalid: false,
              requiresTokenRefresh: false,
              tokenInvalidAt: null,
            }, { merge: true });
            console.log('✅ Token FCM salvo no Firestore para usuário autenticado');
          }
        } catch (error) {
          console.error('❌ Erro ao salvar token FCM para usuário autenticado:', error);
        }
      }
    });

    return () => unsubscribe();
  }, [notificationsInitialized]);

  return null; // App.tsx não renderiza nada, apenas configura notificações
}

export default App;

