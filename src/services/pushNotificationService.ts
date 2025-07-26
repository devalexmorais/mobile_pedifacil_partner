import { getMessaging, onMessage, getToken, onTokenRefresh } from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth, rnFirebaseApp } from '../config/firebase';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import { serverTimestamp } from 'firebase/firestore';

// Configurar o comportamento padrão das notificações em primeiro plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const pushNotificationService = {
  // Navegar para a tela de pedidos
  navigateToPedidos() {
    setTimeout(() => {
      router.push('/(auth)/(tabs)/pedidos');
    }, 300);
  },

  // Configurar notificações em segundo plano para Android
  configureFCMBackgroundHandler() {
    const messaging = getMessaging(rnFirebaseApp);
    
    // Quando o aplicativo está em segundo plano/fechado,
    // este listener é chamado quando o usuário clica na notificação
    messaging.onNotificationOpenedApp(remoteMessage => {
      this.navigateToPedidos();
    });

    // Verificar se o aplicativo foi aberto através de uma notificação quando estava fechado
    messaging
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          this.navigateToPedidos();
        }
      });

    // Garantir que o manipulador de mensagens em segundo plano esteja configurado
    if (Platform.OS === 'android') {
      messaging.setBackgroundMessageHandler(async remoteMessage => {
        // Mostrar uma notificação local mesmo em segundo plano
        await Notifications.scheduleNotificationAsync({
          content: {
            title: remoteMessage.notification?.title || 'Nova notificação',
            body: remoteMessage.notification?.body || '',
            data: remoteMessage.data || {
              screen: 'pedidos'
            },
            sound: true,
          },
          trigger: null,
        });
        
        return Promise.resolve();
      });
    }
  },

  // Solicitar permissões de notificação
  async requestUserPermission() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FFA500',
        sound: 'default',
      });
    }

    let permissionStatus;
    
    if (Platform.OS === 'ios') {
      // Para iOS, precisamos de permissões especiais para notificações em segundo plano
      const messaging = getMessaging(rnFirebaseApp);
      permissionStatus = await messaging.requestPermission({
        sound: true,
        badge: true,
        alert: true,
        provisional: true,
      });
    } else {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowDisplayInCarPlay: true,
          allowCriticalAlerts: true,
          provideAppNotificationSettings: true,
          allowProvisional: true,
        },
      });
      
      permissionStatus = status === 'granted' ? 
        'authorized' : 
        'denied';
    }
    
    const enabled = permissionStatus === 'authorized' || permissionStatus === 'provisional';

    if (enabled) {
      return true;
    }
    
    return false;
  },

  // Obter token FCM
  async getFCMToken() {
    if (!Device.isDevice) {
      return null;
    }
    
    try {
      // Primeiro verificar/solicitar permissão
      const permissionGranted = await this.requestUserPermission();
      if (!permissionGranted) {
        console.log('Permissão para notificações não concedida');
        return null;
      }
      
      // Para iOS, registrar para notificações em segundo plano
      if (Platform.OS === 'ios') {
        try {
          const messaging = getMessaging(rnFirebaseApp);
          await messaging.registerDeviceForRemoteMessages();
        } catch (error) {
          // Erro silencioso para registro de mensagens remotas
        }
      }
      
      // Obter o token
      const messaging = getMessaging(rnFirebaseApp);
      const fcmToken = await getToken(messaging);
      
      // Salvar o token no Firestore
      if (fcmToken) {
        await this.saveTokenToDatabase(fcmToken);
      }
      
      return fcmToken;
    } catch (error) {
      console.error('Erro ao obter token FCM:', error);
      return null;
    }
  },

  // Salvar token no banco de dados
  async saveTokenToDatabase(fcmToken: string) {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, 'partners', user.uid);
      await updateDoc(userRef, {
        fcmToken: fcmToken,
        lastTokenUpdate: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao salvar token no banco de dados:', error);
    }
  },

  // Inicializar o serviço completo de notificações
  async initialize() {
    try {
      // Configurar handlers para notificações em segundo plano
      this.configureFCMBackgroundHandler();
      
      // Obter e salvar FCM token
      await this.getFCMToken();
      
      // Configurar renovação de token
      const messaging = getMessaging(rnFirebaseApp);
      onTokenRefresh(messaging, token => {
        this.saveTokenToDatabase(token);
      });
      
      // Configurar handler para notificações em primeiro plano
      const unsubscribe = onMessage(messaging, async remoteMessage => {
        // Mostrar notificação local
        await Notifications.scheduleNotificationAsync({
          content: {
            title: remoteMessage.notification?.title || 'Nova notificação',
            body: remoteMessage.notification?.body || '',
            data: {
              ...(remoteMessage.data || {}),
              screen: 'pedidos',
              orderId: remoteMessage.data?.orderId || null
            },
            sound: true,
          },
          trigger: null,
        });
      });

      // Configurar resposta para quando uma notificação é clicada
      const responseSubscription = Notifications.addNotificationResponseReceivedListener(
        response => {
          this.navigateToPedidos();
        }
      );
      
      return () => {
        unsubscribe();
        Notifications.removeNotificationSubscription(responseSubscription);
      };
    } catch (error) {
      console.error('Erro ao inicializar serviço de notificações push:', error);
      return () => {};
    }
  }
}; 