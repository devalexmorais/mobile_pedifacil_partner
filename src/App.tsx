import { useEffect, useState, useRef } from 'react';
import { notificationService } from './services/notificationService';
import { pushNotificationService } from './services/pushNotificationService';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { getMessaging } from '@react-native-firebase/messaging';
import { rnFirebaseApp } from './config/firebase';
import { auth } from './config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './config/firebase';

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
      console.log('🔔 Obtendo token de notificação para usuário:', userId);
      
      // Solicitar permissões para notificações
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('❌ Permissão para notificações negada');
        return;
      }
      
      console.log('✅ Permissão para notificações concedida');
      
      // Obter token nativo do dispositivo (para produção)
      const token = await Notifications.getDevicePushTokenAsync();
      console.log('🔑 Token do dispositivo obtido:', token.data ? token.data.substring(0, 20) + '...' : 'Token vazio');
      
      if (!token || !token.data) {
        console.log('⚠️ Token de notificação vazio');
        return;
      }
      
      // Salvar token no Firestore
      const userRef = doc(db, 'partners', userId);
      
      await setDoc(userRef, {
        fcmToken: token.data,
        deviceInfo: {
          lastUpdated: new Date(),
          platform: Platform.OS,
          version: Platform.Version,
          tokenType: 'device_push'
        }
      }, { merge: true });
      
      console.log('🔥 Token de notificação salvo no Firestore para parceiro:', userId);
      
    } catch (error) {
      console.error('❌ Erro ao obter/salvar token de notificação:', error);
    }
  };

  // Inicializar configuração de notificações
  useEffect(() => {
    const initNotifications = async () => {
      try {
        // Para iOS, registrar para notificações remotas
        if (Platform.OS === 'ios') {
          const messaging = getMessaging(rnFirebaseApp);
          await messaging.registerDeviceForRemoteMessages();
        }
        
        // Inicializar FCM para notificações em segundo plano
        const unsubscribeFCM = await pushNotificationService.initialize();
        
        // Inicializar notificações locais com Expo Notifications
        await notificationService.setupPushNotifications();
        
        // Obter e salvar token de notificação se usuário estiver autenticado
        if (auth.currentUser) {
          console.log('👤 Usuário já autenticado, salvando token de notificação...');
          await saveNotificationToken(auth.currentUser.uid);
        }
        
        // Configurar listener global para notificações clicadas
        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
          // Usar setTimeout para evitar problemas de navegação
          setTimeout(() => {
            router.push('/(auth)/(tabs)/pedidos');
          }, 300);
        });
        
        // Configurar verificação de notificação inicial (quando o app é aberto por uma notificação)
        const messaging = getMessaging(rnFirebaseApp);
        messaging
          .getInitialNotification()
          .then(remoteMessage => {
            if (remoteMessage) {
              // Navegar para tela de pedidos
              setTimeout(() => {
                router.push('/(auth)/(tabs)/pedidos');
              }, 500);
            }
          });
        
        setNotificationsInitialized(true);
        
        // Limpeza na desmontagem
        return () => {
          if (typeof unsubscribeFCM === 'function') {
            unsubscribeFCM();
          }
          Notifications.removeNotificationSubscription(responseListener.current);
        };
      } catch (error) {
        console.error('Erro ao inicializar notificações:', error);
        setNotificationsInitialized(true); // Mesmo com erro, marcar como inicializado
      }
    };

    if (!notificationsInitialized) {
      initNotifications();
    }
  }, [notificationsInitialized]);

  // Monitorar mudanças de autenticação para salvar token
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user && notificationsInitialized) {
        console.log('👤 Usuário autenticado, salvando token de notificação...');
        await saveNotificationToken(user.uid);
      }
    });

    return () => unsubscribe();
  }, [notificationsInitialized]);

  return null; // App.tsx não renderiza nada, apenas configura notificações
}

export default App;

