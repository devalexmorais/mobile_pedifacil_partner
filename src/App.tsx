import { useEffect, useState, useRef } from 'react';
import { notificationService } from './services/notificationService';
import { pushNotificationService } from './services/pushNotificationService';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import messaging from '@react-native-firebase/messaging';

// Configurar handler para notificações em primeiro plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Configurar handler para mensagens em segundo plano (fora do componente)
messaging().setBackgroundMessageHandler(async remoteMessage => {
  // Mostrar notificação local mesmo quando o app estiver fechado
  await Notifications.scheduleNotificationAsync({
    content: {
      title: remoteMessage.notification?.title || 'Nova notificação',
      body: remoteMessage.notification?.body || '',
      data: remoteMessage.data || { screen: 'pedidos' },
      sound: true,
    },
    trigger: null,
  });
  
  return Promise.resolve();
});

function App() {
  const [notificationsInitialized, setNotificationsInitialized] = useState(false);
  const responseListener = useRef<any>();

  // Inicializar configuração de notificações
  useEffect(() => {
    const initNotifications = async () => {
      try {
        // Para iOS, registrar para notificações remotas
        if (Platform.OS === 'ios') {
          await messaging().registerDeviceForRemoteMessages();
          await messaging().setAutoInitEnabled(true);
        }
        
        // Inicializar FCM para notificações em segundo plano
        const unsubscribeFCM = await pushNotificationService.initialize();
        
        // Inicializar notificações locais com Expo Notifications
        await notificationService.setupPushNotifications();
        
        // Configurar listener global para notificações clicadas
        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
          // Usar setTimeout para evitar problemas de navegação
          setTimeout(() => {
            router.push('/(auth)/(tabs)/pedidos');
          }, 300);
        });
        
        // Configurar verificação de notificação inicial (quando o app é aberto por uma notificação)
        messaging()
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
      }
    };

    initNotifications();
  }, []);

  return null; // App.tsx não renderiza nada, apenas configura notificações
}
export default App;

