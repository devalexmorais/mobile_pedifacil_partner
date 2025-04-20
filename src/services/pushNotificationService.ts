import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { router } from 'expo-router';

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
    // Usar setTimeout para evitar problemas de navegação antes da inicialização completa
    setTimeout(() => {
      router.push('/(auth)/(tabs)/pedidos');
    }, 300);
  },

  // Configurar notificações em segundo plano para Android
  configureFCMBackgroundHandler() {
    // Quando o aplicativo está em segundo plano/fechado,
    // este listener é chamado quando o usuário clica na notificação
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log(
        'Notificação em segundo plano clicada:',
        remoteMessage.notification,
      );
      
      // Navegar para a tela de pedidos
      this.navigateToPedidos();
    });

    // Verificar se o aplicativo foi aberto através de uma notificação quando estava fechado
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log(
            'Aplicativo aberto por notificação com app fechado:',
            remoteMessage.notification,
          );
          
          // Navegar para a tela de pedidos
          this.navigateToPedidos();
        }
      });

    // Garantir que o manipulador de mensagens em segundo plano esteja configurado
    if (Platform.OS === 'android') {
      messaging().setBackgroundMessageHandler(async remoteMessage => {
        console.log('Mensagem manipulada em segundo plano:', remoteMessage);
        
        // Mostrar uma notificação local mesmo em segundo plano
        await Notifications.scheduleNotificationAsync({
          content: {
            title: remoteMessage.notification?.title || 'Nova notificação',
            body: remoteMessage.notification?.body || '',
            data: remoteMessage.data || {
              screen: 'pedidos' // Adicionar informação de tela para navegação
            },
            sound: true, // Garantir que tenha som
          },
          trigger: null, // exibir imediatamente
        });
        
        return Promise.resolve(); // Necessário retornar uma promise
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
        sound: true, // Garantir que tenha som
      });
    }

    let permissionStatus;
    
    if (Platform.OS === 'ios') {
      // Para iOS, precisamos de permissões especiais para notificações em segundo plano
      permissionStatus = await messaging().requestPermission({
        sound: true,
        badge: true,
        alert: true,
        provisional: true, // Permite notificações sem solicitar explicitamente ao usuário
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
          allowAnnouncements: true,
        },
      });
      
      permissionStatus = status === 'granted' ? 
        messaging.AuthorizationStatus.AUTHORIZED : 
        messaging.AuthorizationStatus.NOT_AUTHORIZED;
    }
    
    const enabled =
      permissionStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      permissionStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Autorização de notificação: ', permissionStatus);
      return true;
    }
    
    console.log('Permissão de notificação recusada');
    return false;
  },

  // Obter token FCM
  async getFCMToken() {
    if (!Device.isDevice) {
      console.log('Notificações push requerem um dispositivo físico');
      return null;
    }
    
    try {
      // Primeiro verificar/solicitar permissão
      const permissionGranted = await this.requestUserPermission();
      if (!permissionGranted) return null;
      
      // Para iOS, registrar para notificações em segundo plano
      if (Platform.OS === 'ios') {
        await messaging().registerDeviceForRemoteMessages();
      }
      
      // Obter o token
      const fcmToken = await messaging().getToken();
      console.log('FCM Token:', fcmToken);
      
      // Salvar o token no Firestore
      if (fcmToken) {
        await this.saveTokenToDatabase(fcmToken);
      }
      
      return fcmToken;
    } catch (error) {
      console.error('Erro ao obter FCM token:', error);
      return null;
    }
  },

  // Salvar token no Firestore
  async saveTokenToDatabase(token: string) {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      // Atualizar documento do parceiro
      const partnerRef = doc(db, 'partners', user.uid);
      await updateDoc(partnerRef, {
        fcmTokens: {
          token,
          device: Device.modelName || 'unknown device',
          platform: Platform.OS,
          updatedAt: new Date()
        }
      });
      
      console.log('Token FCM salvo no banco de dados');
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
      messaging().onTokenRefresh(token => {
        this.saveTokenToDatabase(token);
      });
      
      // Configurar handler para notificações em primeiro plano
      const unsubscribe = messaging().onMessage(async remoteMessage => {
        console.log('Notificação recebida em primeiro plano:', remoteMessage);
        
        // Mostrar notificação local
        await Notifications.scheduleNotificationAsync({
          content: {
            title: remoteMessage.notification?.title || 'Nova notificação',
            body: remoteMessage.notification?.body || '',
            data: {
              ...(remoteMessage.data || {}),
              screen: 'pedidos', // Adicionar informação da tela de destino
              orderId: remoteMessage.data?.orderId || null
            },
            sound: true, // Garantir que tenha som
          },
          trigger: null,
        });
      });

      // Configurar resposta para quando uma notificação é clicada
      const responseSubscription = Notifications.addNotificationResponseReceivedListener(
        response => {
          console.log('Notificação respondida:', response);
          
          // Navegar para a tela de pedidos
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