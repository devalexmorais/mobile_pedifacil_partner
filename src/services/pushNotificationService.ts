import { Platform, Alert } from 'react-native';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import { serverTimestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    // Por enquanto, vamos usar apenas notificações locais do Expo
    // O Firebase Messaging será implementado posteriormente
    console.log('Notificações em segundo plano configuradas com Expo');
  },

  // Mostrar alerta explicativo antes de solicitar permissões
  async showPermissionAlert(): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        '🔔 Notificações Importantes',
        'Para receber notificações de novos pedidos e atualizações importantes, precisamos da sua permissão.\n\nIsso nos permite:\n• Notificar sobre novos pedidos\n• Avisar sobre mudanças de status\n• Manter você sempre informado\n\nDeseja permitir as notificações?',
        [
          {
            text: 'Agora não',
            style: 'cancel',
            onPress: () => {
              console.log('❌ Usuário negou permissão de notificação');
              resolve(false);
            }
          },
          {
            text: 'Permitir',
            onPress: () => {
              console.log('✅ Usuário aceitou solicitar permissão');
              resolve(true);
            }
          }
        ],
        { cancelable: false }
      );
    });
  },

  // Solicitar permissões de notificação (usando apenas Expo Notifications)
  async requestUserPermission() {
    try {
      console.log('🔔 Iniciando solicitação de permissões de notificação...');
      
      // Mostrar alerta explicativo primeiro
      const userAccepted = await this.showPermissionAlert();
      if (!userAccepted) {
        console.log('❌ Usuário não aceitou solicitar permissão');
        return false;
      }

      // Configurar canal Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Notificações de Pedidos',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FFA500',
          sound: 'default',
          description: 'Notificações sobre novos pedidos e atualizações'
        });
      }

      // Solicitar permissões do Expo Notifications
      console.log('📱 Solicitando permissões do Expo Notifications...');
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
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
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('❌ Permissão para notificações negada');
        Alert.alert(
          'Permissão Negada',
          'Para receber notificações, você precisa permitir nas configurações do app.',
          [{ text: 'OK' }]
        );
        return false;
      }
      
      console.log('✅ Permissão para notificações concedida');
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao solicitar permissões:', error);
      Alert.alert(
        'Erro',
        'Ocorreu um erro ao solicitar permissões de notificação.',
        [{ text: 'OK' }]
      );
      return false;
    }
  },

  // Obter token FCM via Expo Notifications (compatível com managed workflow)
  async getFCMToken() {
    try {
      // Primeiro verificar/solicitar permissão
      const permissionGranted = await this.requestUserPermission();
      if (!permissionGranted) {
        console.log('❌ Permissão para notificações não concedida');
        return null;
      }
      
      console.log('🔑 Obtendo token via Expo Notifications...');
      
      // Obter token via Expo Notifications (gera token FCM válido)
      const token = await Notifications.getDevicePushTokenAsync();
      
      if (!token || !token.data) {
        console.error('❌ Token não obtido do Expo Notifications');
        return null;
      }
      
      console.log('✅ Token obtido:', token.data.substring(0, 20) + '...');
      console.log('📏 Comprimento do token:', token.data.length, 'caracteres');
      
      // Verificar se é um token FCM válido (deve ter mais de 100 caracteres)
      if (token.data.length < 100) {
        console.log('⚠️ Token pode não ser FCM válido, mas continuando...');
      }
      
      // Limpar o token removendo espaços e caracteres especiais
      const cleanToken = token.data.trim().replace(/[\s{}]/g, '');
      console.log('🧹 Token limpo:', cleanToken.substring(0, 20) + '...');
      console.log('📏 Comprimento do token limpo:', cleanToken.length, 'caracteres');
      
      // Salvar o token no AsyncStorage como backup
      await this.saveTokenToAsyncStorage(cleanToken);
      
      // Salvar o token no Firestore
      await this.saveTokenToDatabase(cleanToken);
      
      // Mostrar feedback de sucesso
      Alert.alert(
        '✅ Notificações Ativadas!',
        'Agora você receberá notificações sobre novos pedidos e atualizações importantes.',
        [{ text: 'Perfeito!' }]
      );
      
      return cleanToken;
    } catch (error) {
      console.error('❌ Erro ao obter token:', error);
      return null;
    }
  },

  // Salvar token no AsyncStorage como backup
  async saveTokenToAsyncStorage(fcmToken: string) {
    try {
      const user = auth.currentUser;
      if (!user) return;

      await AsyncStorage.setItem('fcm_token', fcmToken);
      await AsyncStorage.setItem('fcm_token_user', user.uid);
      await AsyncStorage.setItem('fcm_token_date', new Date().toISOString());
      
      console.log('💾 Token FCM salvo no AsyncStorage como backup');
    } catch (error) {
      console.error('❌ Erro ao salvar token no AsyncStorage:', error);
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
        lastTokenUpdate: serverTimestamp(),
        tokenInvalid: false,
        requiresTokenRefresh: false,
        tokenInvalidAt: null,
        // Remover campos antigos de tokens Expo se existirem
        notificationTokens: null,
        fcmTokens: null
      });
      
      console.log('✅ Token FCM salvo no Firestore (apenas FCM)');
    } catch (error) {
      console.error('❌ Erro ao salvar token no banco de dados:', error);
    }
  },

  // Verificar se o token precisa ser renovado
  async checkTokenRefresh() {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Verificar se já existe um token salvo no AsyncStorage
      const existingToken = await AsyncStorage.getItem('fcm_token');
      if (existingToken) {
        console.log('✅ Token já existe no AsyncStorage:', existingToken.substring(0, 20) + '...');
        // Verificar se o token do AsyncStorage é válido (mais de 100 caracteres)
        if (existingToken.length > 100) {
          console.log('✅ Token do AsyncStorage parece válido, usando ele');
          // Salvar o token existente no Firestore se necessário
          await this.saveTokenToDatabase(existingToken);
          return;
        } else {
          console.log('⚠️ Token do AsyncStorage parece inválido, renovando...');
        }
      }

      const userRef = doc(db, 'partners', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Se o token está marcado como inválido ou precisa de renovação
        if (userData.tokenInvalid || userData.requiresTokenRefresh) {
          console.log('🔄 Token marcado como inválido - renovando...');
          await this.getFCMToken();
        }
      }
    } catch (error) {
      console.error('❌ Erro ao verificar renovação de token:', error);
    }
  },

  // Inicializar o serviço completo de notificações
  async initialize() {
    try {
      // Configurar handlers para notificações em segundo plano
      this.configureFCMBackgroundHandler();
      
      // Verificar se o token precisa ser renovado
      await this.checkTokenRefresh();
      
      // Obter e salvar FCM token (se não foi renovado acima)
      await this.getFCMToken();
      
      // Configurar listener para mudanças de token
      const tokenListener = Notifications.addNotificationReceivedListener(notification => {
        console.log('🔔 Notificação recebida:', notification);
      });

      // Configurar resposta para quando uma notificação é clicada
      const responseSubscription = Notifications.addNotificationResponseReceivedListener(
        response => {
          console.log('🔔 Notificação clicada:', response);
          this.navigateToPedidos();
        }
      );
      
      return () => {
        Notifications.removeNotificationSubscription(tokenListener);
        Notifications.removeNotificationSubscription(responseSubscription);
      };
    } catch (error) {
      console.error('❌ Erro ao inicializar serviço de notificações push:', error);
      return () => {};
    }
  },

  // Inicializar apenas a configuração básica (sem solicitar token)
  async initializeWithoutToken() {
    try {
      console.log('🔧 Inicializando serviço de notificações (sem solicitar token)');
      
      // Configurar handlers para notificações em segundo plano
      this.configureFCMBackgroundHandler();
      
      // Configurar listener para mudanças de token
      const tokenListener = Notifications.addNotificationReceivedListener(notification => {
        console.log('🔔 Notificação recebida:', notification);
      });

      // Configurar resposta para quando uma notificação é clicada
      const responseSubscription = Notifications.addNotificationResponseReceivedListener(
        response => {
          console.log('🔔 Notificação clicada:', response);
          this.navigateToPedidos();
        }
      );
      
      return () => {
        Notifications.removeNotificationSubscription(tokenListener);
        Notifications.removeNotificationSubscription(responseSubscription);
      };
    } catch (error) {
      console.error('❌ Erro ao inicializar serviço de notificações push:', error);
      return () => {};
    }
  }
}; 