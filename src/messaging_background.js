import { setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { rnFirebaseApp } from './config/firebase';

// Configurar handler para mensagens em segundo plano
setBackgroundMessageHandler(rnFirebaseApp, async remoteMessage => {
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