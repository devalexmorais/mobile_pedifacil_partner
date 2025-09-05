import { collection, query, orderBy, getDocs, doc, updateDoc, where, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform, AppState } from 'react-native';
import { addDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import messaging from '@react-native-firebase/messaging';

export interface NotificationData {
  id: string;
  body: string;
  createdAt: any; // timestamp
  data: {
    orderId?: string;
    status?: string;
    userId?: string;
    type?: string;
    action?: string;
    couponCode?: string;
    discountType?: 'percentage' | 'fixed';
    discountValue?: number;
    storeId?: string;
    storeName?: string;
    [key: string]: any; // Permitir outras propriedades
  };
  read: boolean;
  viewed?: boolean; // Campo para controlar se foi vista via push
  title: string;
}

interface RawNotification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  data?: any;
  createdAt: any;
}

// Configuração global do manipulador de notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Cache para controlar notificações já processadas
const processedNotificationIds = new Set<string>();

// Controle do estado do app para notificações inteligentes
let isAppInForeground = AppState.currentState === 'active';
let fcmUnsubscribe: (() => void) | null = null;

// Função para carregar IDs processados do localStorage
const loadProcessedNotificationIds = (): Set<string> => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem('processedNotificationIds');
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    }
  } catch (error) {
    console.error('Erro ao carregar IDs de notificações processadas:', error);
  }
  return new Set<string>();
};

// Função para salvar IDs processados no localStorage
const saveProcessedNotificationIds = (ids: Set<string>): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('processedNotificationIds', JSON.stringify([...ids]));
    }
  } catch (error) {
    console.error('Erro ao salvar IDs de notificações processadas:', error);
  }
};

// Carregar IDs processados na inicialização
const processedIds = loadProcessedNotificationIds();
processedNotificationIds.clear();
processedIds.forEach(id => processedNotificationIds.add(id));

// Função para controlar estado do app
const handleAppStateChange = (nextAppState: string) => {
  isAppInForeground = nextAppState === 'active';
  console.log(`📱 Estado do app alterado: ${nextAppState} - Foreground: ${isAppInForeground}`);
};

// Função para mostrar notificação local apenas quando app está em foreground
const showLocalNotification = async (title: string, body: string, data: any = {}) => {
  const currentAppState = AppState.currentState;
  console.log(`🔍 Estado atual do app: ${currentAppState}, isAppInForeground: ${isAppInForeground}`);
  
  if (!isAppInForeground || currentAppState !== 'active') {
    console.log('🚫 App em background - FCM nativo cuidará da notificação');
    return;
  }

  try {
    console.log('📱 App em foreground - mostrando notificação local');
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
    console.error('❌ Erro ao mostrar notificação local:', error);
  }
};

// Configurar FCM listeners
const setupFCMListeners = () => {
  try {
    // Listener para quando app está em foreground
    const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
      console.log('🔔 FCM mensagem recebida em foreground:', remoteMessage);
      
      if (remoteMessage.notification) {
        // Verificar se app está realmente em foreground antes de mostrar notificação local
        const currentState = AppState.currentState;
        console.log(`🔍 Estado do app no onMessage: ${currentState}`);
        
        if (currentState === 'active') {
          await showLocalNotification(
            remoteMessage.notification.title || 'Nova notificação',
            remoteMessage.notification.body || '',
            remoteMessage.data || {}
          );
        } else {
          console.log('🚫 App não está em foreground - FCM nativo cuidará da notificação');
        }
      }
    });

    // Handler para quando app está em background/quitado
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('🔔 FCM mensagem recebida em background:', remoteMessage);
      // O FCM nativo já exibe a notificação automaticamente
      // Não precisamos fazer nada aqui
    });

    // Configurar listener de mudança de estado do app
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    fcmUnsubscribe = () => {
      unsubscribeForeground();
      appStateSubscription?.remove();
    };

    console.log('✅ FCM listeners configurados com sucesso');
  } catch (error) {
    console.error('❌ Erro ao configurar FCM listeners:', error);
  }
};

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
          viewed: data.viewed || false,
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

  // Marcar notificação como vista (quando mostrada via push)
  async markAsViewed(notificationId: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');

      const notificationRef = doc(db, 'partners', user.uid, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        viewed: true // Campo adicional para controlar se foi vista via push
      });
    } catch (error) {
      console.error('Erro ao marcar notificação como vista:', error);
      throw error;
    }
  },

  // Limpar cache de notificações processadas
  clearProcessedNotificationsCache(): void {
    processedNotificationIds.clear();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('processedNotificationIds');
      }
    } catch (error) {
      console.error('Erro ao limpar cache de notificações processadas:', error);
    }
  },

  // Registrar para notificações push
  async registerForPushNotificationsAsync(): Promise<string | undefined> {
    // Token Expo removido - usando apenas FCM
    console.log('⚠️ Token Expo não é mais obtido - usando apenas FCM');
    return undefined;
  },

  // Configurar notificações push com sistema inteligente
  async setupPushNotifications(): Promise<(() => void) | undefined> {
    try {
      console.log('🔧 Configurando sistema inteligente de notificações...');
      
      // Configurar FCM listeners (foreground/background)
      setupFCMListeners();

      // Configurar listener para notificações clicadas (Expo)
      const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('🔔 Notificação clicada:', response);
        // Processar dados da notificação quando o usuário clica
        const data = response.notification.request.content.data;
        
        // Aqui você pode adicionar lógica de navegação ou processamento
        // com base nos dados da notificação
      });
      
      // Retornar função de limpeza para os componentes que chamarem esta função
      return () => {
        Notifications.removeNotificationSubscription(responseSubscription);
        if (fcmUnsubscribe) {
          fcmUnsubscribe();
        }
      };
    } catch (error) {
      console.error('❌ Erro ao configurar notificações push:', error);
      throw error;
    }
  },

  // Salvar token de notificação no perfil do usuário
  async saveNotificationToken(token: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      // Não salvar mais tokens Expo - apenas FCM será usado
      console.log('⚠️ Salvamento de token Expo desabilitado - usando apenas FCM');
      return;

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
            viewed: data.viewed || false,
            data: data.data || {}
          });
        });
        
        callback(notifications);
        
        // Verificar se há novas notificações não lidas para enviar push
        const newNotifications = snapshot.docChanges()
          .filter(change => change.type === 'added')
          .map(change => ({ id: change.doc.id, ...change.doc.data() } as RawNotification));
        
        // Processar notificações novas (sem enviar push local - FCM já cuida disso)
        newNotifications.forEach(notification => {
          // Verificar se a notificação já foi processada
          if (!notification.read && !processedNotificationIds.has(notification.id)) {
            // Marcar como processada
            processedNotificationIds.add(notification.id);
            
            // Salvar no localStorage
            saveProcessedNotificationIds(processedNotificationIds);
            
            // NÃO enviar push notification local aqui - FCM já cuida disso
            // A notificação push será enviada pela Cloud Function via FCM
            console.log('📝 Nova notificação detectada no Firestore - FCM enviará push automaticamente');
            
            // Marcar como vista (opcional - para controle adicional)
            // this.markAsViewed(notification.id).catch(console.error);
          }
        });
        
        // Limpar cache de IDs processados para notificações que não existem mais
        // (para evitar vazamento de memória)
        const currentIds = new Set(notifications.map(n => n.id));
        for (const id of processedNotificationIds) {
          if (!currentIds.has(id)) {
            processedNotificationIds.delete(id);
          }
        }
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('Erro ao configurar listener de notificações:', error);
      // Retornar uma função vazia em caso de erro
      return () => {};
    }
  },

  // Enviar notificação push usando sistema inteligente
  async sendPushNotification(title: string, body: string, data: any = {}): Promise<void> {
    try {
      // Usar a função inteligente que verifica o estado do app
      await showLocalNotification(title, body, data);
    } catch (error) {
      console.error('❌ Erro ao enviar notificação push:', error);
      throw error;
    }
  },

  async sendOrderNotification(userId: string, data: NotificationData) {
    try {
      
      const userNotificationsRef = collection(db, 'users', userId, 'notifications');
      
      // Limpar dados para remover campos undefined
      const cleanData: any = {};
      if (data.data) {
        Object.keys(data.data).forEach(key => {
          if (data.data[key] !== undefined) {
            cleanData[key] = data.data[key];
          }
        });
      }
      
      // Preparar dados da notificação (mesmo formato do cupom)
      const notificationData = {
        title: data.title,
        body: data.body,
        data: cleanData,
        read: false,
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(userNotificationsRef, notificationData);
      
      // Notificação push será enviada automaticamente pela Cloud Function
      // quando detectar a nova notificação no Firestore
      console.log('📝 Notificação salva no Firestore - Cloud Function enviará push automaticamente');
      
      return docRef.id;
    } catch (error) {
      console.error('❌ Erro ao enviar notificação:', error);
      console.error('🔍 Detalhes do erro:', {
        userId,
        data,
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
        errorCode: error instanceof Error ? (error as any).code : 'UNKNOWN'
      });
      throw error;
    }
  },

  // Nova função para enviar notificação de pedido para usuário específico (como cupom)
  async sendOrderStatusNotificationToUser(userId: string, orderId: string, status: string, partnerId?: string) {
    try {

      
      // Gerar mensagem baseada no status
      const getNotificationData = (status: string): { title: string; body: string } => {
        switch (status) {
          case 'preparing':
            return {
              title: 'Pedido Aceito',
              body: `Seu pedido #${orderId.slice(-4)} foi aceito e está sendo preparado!`
            };
          case 'ready':
            return {
              title: 'Pedido Pronto',
              body: `Seu pedido #${orderId.slice(-4)} está pronto!`
            };
          case 'out_for_delivery':
            return {
              title: 'Pedido em Entrega',
              body: `Seu pedido #${orderId.slice(-4)} saiu para entrega!`
            };
          case 'delivered':
            return {
              title: 'Pedido Entregue',
              body: `Seu pedido #${orderId.slice(-4)} foi entregue. Bom apetite!`
            };
          case 'cancelled':
            return {
              title: 'Pedido Cancelado',
              body: `Seu pedido #${orderId.slice(-4)} foi cancelado.`
            };
          default:
            return {
              title: 'Status do Pedido Atualizado',
              body: `O status do seu pedido #${orderId.slice(-4)} foi atualizado.`
            };
        }
      };
      
      const notificationData = getNotificationData(status);
      
      // Preparar dados da notificação sem campos undefined
      const notificationDataObj: any = {
        orderId,
        status,
        userId,
        type: 'order_status'
      };
      
      // Adicionar partnerId apenas se não for undefined
      if (partnerId) {
        notificationDataObj.partnerId = partnerId;
      }
      
      const notificationPayload = {
        id: orderId,
        title: notificationData.title,
        body: notificationData.body,
        createdAt: new Date(),
        read: false,
        data: notificationDataObj
      };
      
      // Enviar notificação usando a mesma função do cupom
      const notificationId = await this.sendOrderNotification(userId, notificationPayload);
      
      console.log(`✅ Notificação de status enviada com sucesso! ID: ${notificationId}`);
      return notificationId;
      
    } catch (error) {
      console.error('❌ Erro ao enviar notificação de status:', error);
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
      

    } catch (error) {
      console.error('Erro ao enviar notificação de teste:', error);
    }
  },

  // Função de teste para verificar se as notificações estão funcionando
  async testNotification(userId: string): Promise<void> {
    try {

      
      const testNotification = await this.sendOrderNotification(userId, {
        id: 'test-' + Date.now(),
        title: '🧪 Teste de Notificação',
        body: 'Esta é uma notificação de teste para verificar se o sistema está funcionando!',
        createdAt: new Date(),
        read: false,
        data: {
          type: 'test',
          testId: Date.now()
        }
      });
      
      console.log('✅ Teste de notificação concluído com sucesso!');
      console.log('📋 ID da notificação de teste:', testNotification);
      
    } catch (error) {
      console.error('❌ Erro no teste de notificação:', error);
      throw error;
    }
  },

  // Criar notificação de cancelamento por inatividade
  async createInactivityNotification(orderId: string, orderDetails?: { customerName?: string, totalValue?: number, minutesPending?: number }): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error('❌ Usuário não autenticado para criar notificação de inatividade');
        return;
      }

      const { customerName, totalValue, minutesPending } = orderDetails || {};
      
      const title = '🚫 Pedido Cancelado por Inatividade';
      const body = customerName 
        ? `Pedido #${orderId.slice(-4)} de ${customerName} foi cancelado automaticamente por inatividade após ${minutesPending || 15} minutos.`
        : `Pedido #${orderId.slice(-4)} foi cancelado automaticamente por inatividade após ${minutesPending || 15} minutos.`;

      const notificationsRef = collection(db, 'partners', user.uid, 'notifications');
      
      await addDoc(notificationsRef, {
        title,
        body,
        data: {
          orderId,
          status: 'canceled',
          reason: 'inactivity',
          minutesPending: minutesPending || 15,
          totalValue: totalValue || 0,
          customerName: customerName || 'N/A'
        },
        read: false,
        createdAt: serverTimestamp()
      });


      
      // Notificação push será enviada automaticamente pela Cloud Function
      console.log('📝 Notificação de inatividade salva - Cloud Function enviará push automaticamente');

    } catch (error) {
      console.error('❌ Erro ao criar notificação de inatividade:', error);
    }
  },

  // Criar notificação de fechamento por inatividade
  async createStoreClosedInactivityNotification(canceledOrdersCount: number): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error('❌ Usuário não autenticado para criar notificação de fechamento');
        return;
      }

      const title = '🏪 Estabelecimento Fechado por Inatividade';
      const body = canceledOrdersCount === 1 
        ? `Seu estabelecimento foi fechado automaticamente após cancelar 1 pedido por inatividade.`
        : `Seu estabelecimento foi fechado automaticamente após cancelar ${canceledOrdersCount} pedidos por inatividade.`;

      const notificationsRef = collection(db, 'partners', user.uid, 'notifications');
      
      await addDoc(notificationsRef, {
        title,
        body,
        data: {
          reason: 'store_closed_inactivity',
          canceledOrdersCount,
          timestamp: new Date().toISOString()
        },
        read: false,
        createdAt: serverTimestamp()
      });


      
      // Notificação push será enviada automaticamente pela Cloud Function
      console.log('📝 Notificação de fechamento salva - Cloud Function enviará push automaticamente');

    } catch (error) {
      console.error('❌ Erro ao criar notificação de fechamento por inatividade:', error);
    }
  },

  // Criar notificação resumo de cancelamentos por inatividade (quando há múltiplos)
  async createBulkInactivityNotification(canceledOrders: Array<{ orderId: string, customerName?: string, totalValue?: number, minutesPending?: number }>): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error('❌ Usuário não autenticado para criar notificação de cancelamentos em lote');
        return;
      }

      if (canceledOrders.length === 0) return;

      if (canceledOrders.length === 1) {
        // Se é apenas um pedido, usa a função individual
        const order = canceledOrders[0];
        await this.createInactivityNotification(order.orderId, {
          customerName: order.customerName,
          totalValue: order.totalValue,
          minutesPending: order.minutesPending
        });
        return;
      }

      const title = `🚫 ${canceledOrders.length} Pedidos Cancelados por Inatividade`;
      const totalValue = canceledOrders.reduce((sum, order) => sum + (order.totalValue || 0), 0);
      
      // Verifica se há pedidos com diferentes tempos de espera
      const maxMinutes = Math.max(...canceledOrders.map(o => o.minutesPending || 0));
      const hasMultipleTimes = canceledOrders.some(o => (o.minutesPending || 0) < 15);
      
      const body = hasMultipleTimes
        ? `${canceledOrders.length} pedidos foram cancelados automaticamente por inatividade (cancelamento em massa devido a pedido com ${maxMinutes} minutos). Valor total: R$ ${totalValue.toFixed(2)}`
        : `${canceledOrders.length} pedidos foram cancelados automaticamente por inatividade. Valor total: R$ ${totalValue.toFixed(2)}`;

      const notificationsRef = collection(db, 'partners', user.uid, 'notifications');
      
      await addDoc(notificationsRef, {
        title,
        body,
        data: {
          reason: 'bulk_inactivity',
          canceledOrdersCount: canceledOrders.length,
          totalValue,
          orderIds: canceledOrders.map(o => o.orderId),
          maxMinutesPending: maxMinutes,
          isMassCancellation: hasMultipleTimes,
          timestamp: new Date().toISOString()
        },
        read: false,
        createdAt: serverTimestamp()
      });


      
      // Notificação push será enviada automaticamente pela Cloud Function
      console.log('📝 Notificação em lote salva - Cloud Function enviará push automaticamente');

    } catch (error) {
      console.error('❌ Erro ao criar notificação de cancelamentos em lote:', error);
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