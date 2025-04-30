import { collection, query, orderBy, getDocs, doc, updateDoc, where, getDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { addDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

export interface NotificationData {
  id: string;
  body: string;
  createdAt: any; // timestamp
  data: {
    orderId?: string;
    status?: string;
    userId?: string;
  };
  read: boolean;
  title: string;
}

// Configuração global do manipulador de notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const notificationService = {
  // Verificar se usuário está autenticado
  isAuthenticated(): boolean {
    return !!auth.currentUser;
  },

  // Buscar todas as notificações do parceiro
  async getNotifications(): Promise<NotificationData[]> {
    try {
      const user = auth.currentUser;
      if (!user) return []; // Retornar array vazio se não estiver autenticado

      const notificationsRef = collection(db, 'partners', user.uid, 'notifications');
      const q = query(notificationsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      const notifications: NotificationData[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        notifications.push({
          id: doc.id,
          title: data.title,
          body: data.body,
          createdAt: data.createdAt?.toDate() || new Date(),
          read: data.read || false,
          data: data.data || {}
        });
      });

      return notifications;
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      return []; // Retornar array vazio em caso de erro
    }
  },

  // Buscar notificações não lidas
  async getUnreadNotificationsCount(): Promise<number> {
    try {
      const user = auth.currentUser;
      if (!user) return 0; // Retornar 0 se não estiver autenticado

      const notificationsRef = collection(db, 'partners', user.uid, 'notifications');
      const q = query(notificationsRef, where('read', '==', false));
      const querySnapshot = await getDocs(q);

      return querySnapshot.size;
    } catch (error) {
      console.error('Erro ao buscar contagem de notificações não lidas:', error);
      return 0; // Retornar 0 em caso de erro
    }
  },

  // Marcar notificação como lida
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');

      const notificationRef = doc(db, 'partners', user.uid, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true
      });
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      throw error;
    }
  },

  // Marcar todas as notificações como lidas
  async markAllAsRead(): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');

      const notifications = await this.getNotifications();
      const unreadNotifications = notifications.filter(notification => !notification.read);

      // Usar Promise.all para marcar todas em paralelo
      const promises = unreadNotifications.map(notification => 
        this.markAsRead(notification.id)
      );

      await Promise.all(promises);
    } catch (error) {
      console.error('Erro ao marcar todas notificações como lidas:', error);
      throw error;
    }
  },

  // Registrar para notificações push
  async registerForPushNotificationsAsync(): Promise<string | undefined> {
    let token;
  
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FFA500',
      });
    }
  
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Falha ao obter token push para notificações!');
        return undefined;
      }
      
      try {
        token = (await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        })).data;
        
        console.log('Token de notificação push:', token);
      } catch (error) {
        console.error('Erro ao obter token de notificação:', error);
      }
    } else {
      console.log('Notificações push requerem um dispositivo físico');
    }
  
    return token;
  },

  // Configurar notificações push
  async setupPushNotifications(): Promise<void> {
    try {
      // Registrar para token de notificação push
      const token = await this.registerForPushNotificationsAsync();
      
      if (!token) {
        console.log('Não foi possível obter token de notificação');
        return;
      }
      
      // Salvar token no perfil do usuário se autenticado
      if (this.isAuthenticated()) {
        await this.saveNotificationToken(token);
      }

      // Configurar listener para notificações recebidas quando o app está em primeiro plano
      const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notificação recebida em primeiro plano:', notification);
      });
      
      // Configurar listener para notificações clicadas
      const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Notificação respondida:', response);
        
        // Processar dados da notificação quando o usuário clica
        const data = response.notification.request.content.data;
        console.log('Dados da notificação:', data);
        
        // Aqui você pode adicionar lógica de navegação ou processamento
        // com base nos dados da notificação
      });
      
      // Retornar função de limpeza para os componentes que chamarem esta função
      return () => {
        Notifications.removeNotificationSubscription(foregroundSubscription);
        Notifications.removeNotificationSubscription(responseSubscription);
      };
    } catch (error) {
      console.error('Erro ao configurar notificações push:', error);
      throw error;
    }
  },

  // Salvar token de notificação no perfil do usuário
  async saveNotificationToken(token: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      const partnerRef = doc(db, 'partners', user.uid);
      await updateDoc(partnerRef, {
        notificationTokens: {
          expoToken: token,
          updatedAt: new Date()
        }
      });
      
      console.log('Token de notificação salvo com sucesso');
    } catch (error) {
      console.error('Erro ao salvar token de notificação:', error);
    }
  },

  // Configurar escuta de notificações em tempo real
  setupNotificationsListener(callback: (notifications: NotificationData[]) => void): () => void {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');

      const notificationsRef = collection(db, 'partners', user.uid, 'notifications');
      const q = query(notificationsRef, orderBy('createdAt', 'desc'));
      
      // Configurar listener
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const notifications: NotificationData[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          notifications.push({
            id: doc.id,
            title: data.title,
            body: data.body,
            createdAt: data.createdAt?.toDate() || new Date(),
            read: data.read || false,
            data: data.data || {}
          });
        });
        
        callback(notifications);
        
        // Verificar se há novas notificações não lidas para enviar push
        const newNotifications = snapshot.docChanges()
          .filter(change => change.type === 'added')
          .map(change => ({ id: change.doc.id, ...change.doc.data() }));
        
        // Enviar notificação push para cada nova notificação
        newNotifications.forEach(notification => {
          if (!notification.read) {
            this.sendPushNotification(notification.title, notification.body, notification.data);
          }
        });
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('Erro ao configurar listener de notificações:', error);
      // Retornar uma função vazia em caso de erro
      return () => {};
    }
  },

  // Enviar notificação push
  async sendPushNotification(title: string, body: string, data: any = {}): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          vibrate: [0, 250, 250, 250],
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Enviar imediatamente
      });
    } catch (error) {
      console.error('Erro ao enviar notificação push:', error);
      throw error;
    }
  },

  async sendOrderNotification(userId: string, data: NotificationData) {
    try {
      const userNotificationsRef = collection(db, 'users', userId, 'notifications');
      
      await addDoc(userNotificationsRef, {
        ...data,
        createdAt: serverTimestamp(),
        read: false
      });
      
      console.log('Notificação enviada com sucesso');
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      throw error;
    }
  },

  // Função auxiliar para gerar mensagens de status do pedido
  getOrderStatusMessage(status: string, orderId: string, userId: string, totalValue?: number): NotificationData {
    const getTitle = (status: string): string => {
      switch (status) {
        case 'accepted':
          return 'Pedido Aceito';
        case 'ready':
          return 'Pedido Pronto';
        case 'delivery':
          return 'Pedido em Entrega';
        case 'completed':
          return 'Pedido Entregue';
        case 'cancelled':
          return 'Pedido Cancelado';
        case 'pending':
          return 'Novo Pedido Recebido';
        default:
          return 'Status do Pedido Atualizado';
      }
    };

    const getBody = (status: string): string => {
      switch (status) {
        case 'accepted':
          return `Seu pedido #${orderId.slice(-4)} foi aceito e está sendo preparado!`;
        case 'ready':
          return `Seu pedido #${orderId.slice(-4)} está pronto!`;
        case 'delivery':
          return `Seu pedido #${orderId.slice(-4)} saiu para entrega!`;
        case 'completed':
          return `Seu pedido #${orderId.slice(-4)} foi entregue. Bom apetite!`;
        case 'cancelled':
          return `Seu pedido #${orderId.slice(-4)} foi cancelado.`;
        case 'pending':
          return totalValue 
            ? `Você recebeu um novo pedido no valor de R$ ${totalValue.toFixed(2)}.`
            : `Você recebeu um novo pedido.`;
        default:
          return `O status do seu pedido #${orderId.slice(-4)} foi atualizado.`;
      }
    };

    return {
      id: orderId,
      title: getTitle(status),
      body: getBody(status),
      createdAt: serverTimestamp(),
      data: {
        orderId,
        status,
        userId
      },
      read: false
    };
  },

  // Enviar notificação de teste (para testar a Cloud Function)
  async sendTestNotification(params: { 
    title?: string; 
    body?: string; 
    type?: string; 
    screen?: string;
  } = {}): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error('Usuário não autenticado');
        return;
      }
      
      const functionsInstance = getFunctions();
      const createTestNotification = httpsCallable(functionsInstance, 'createTestNotification');
      
      const result = await createTestNotification({
        partnerId: user.uid,
        title: params.title || 'Notificação de teste',
        body: params.body || 'Esta é uma notificação de teste',
        type: params.type || 'test',
        screen: params.screen || 'notifications'
      });
      
      console.log('Notificação de teste enviada:', result.data);
    } catch (error) {
      console.error('Erro ao enviar notificação de teste:', error);
    }
  },

  // Excluir todas as notificações
  async deleteAllNotifications(): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');

      const notificationsRef = collection(db, 'partners', user.uid, 'notifications');
      const q = query(notificationsRef);
      const querySnapshot = await getDocs(q);

      // Usar Promise.all para excluir todas em paralelo
      const promises = querySnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );

      await Promise.all(promises);
    } catch (error) {
      console.error('Erro ao excluir todas as notificações:', error);
      throw error;
    }
  }
}; 