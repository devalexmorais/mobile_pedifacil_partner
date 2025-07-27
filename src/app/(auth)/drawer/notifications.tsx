import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Text, Alert, AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NotificationItem } from '../../../components/NotificationItem';
import { EmptyNotifications } from '../../../components/EmptyNotifications';
import { notificationService, NotificationData } from '../../../services/notificationService';
import { pushNotificationService } from '../../../services/pushNotificationService';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { LoadingSpinner } from '@/components';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const appState = useRef(AppState.currentState);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  // Configurar notificações push e ouvir por notificações em primeiro plano
  useEffect(() => {
    async function setupNotifications() {
      try {
        // Inicializar o serviço completo de push notifications
        await pushNotificationService.initialize();
        
        // Configurar notificações expo
        await notificationService.setupPushNotifications();
        
        // Verificar token FCM
        await pushNotificationService.getFCMToken();

        // Ouvir por notificações recebidas em primeiro plano
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
          // Atualizar lista de notificações quando uma nova for recebida
          setRefreshing(true);
        });

        // Ouvir por notificações respondidas (clicadas pelo usuário)
        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
          const data = response.notification.request.content.data;
          
          // Navegar sempre para a tela de pedidos
          router.push('/(auth)/(tabs)/pedidos');
        });
        
        // Monitorar mudanças no estado do aplicativo
        const subscription = AppState.addEventListener('change', nextAppState => {
          if (
            appState.current.match(/inactive|background/) && 
            nextAppState === 'active'
          ) {
            // Atualizar notificações quando o app voltar para o primeiro plano
            setRefreshing(true);
          }
          
          appState.current = nextAppState;
        });

        return () => {
          // Limpar listeners quando o componente for desmontado
          Notifications.removeNotificationSubscription(notificationListener.current);
          Notifications.removeNotificationSubscription(responseListener.current);
          subscription.remove();
        };
      } catch (error) {
        console.error('Erro ao configurar notificações:', error);
      }
    }

    setupNotifications();
  }, [router]);

  // Configurar listener em tempo real quando a tela é carregada
  useEffect(() => {
    setLoading(true);
    
    // Configurar o listener de notificações em tempo real
    const unsubscribe = notificationService.setupNotificationsListener((updatedNotifications) => {
      setNotifications(updatedNotifications);
      setLoading(false);
      setRefreshing(false);
    });
    
    // Desinscrever quando o componente for desmontado
    return () => {
      unsubscribe();
    };
  }, []);
  
  // Recarregar notificações quando a tela for focada
  useFocusEffect(
    useCallback(() => {
      // Não recarregar automaticamente quando a tela é focada
      // O listener em tempo real já mantém os dados atualizados
      // Apenas garantir que o loading seja removido se ainda estiver ativo
      if (loading) {
        setLoading(false);
      }
      
      return () => {
        // cleanup if needed
      };
    }, [loading])
  );

  // Função para lidar com refresh manual
  const handleRefresh = () => {
    setRefreshing(true);
    // O listener irá atualizar os dados automaticamente
    // Apenas para garantir, podemos definir um timeout para parar o indicador de refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  // Função para lidar com clique em uma notificação
  const handleNotificationPress = async (notification: NotificationData) => {
    try {
      // Marcar como lida
      if (!notification.read) {
        await notificationService.markAsRead(notification.id);
        
        // Não precisamos atualizar o estado local, pois o listener fará isso
      }
      
      // Navegar para a tela de pedidos em todos os casos
      router.push('/(auth)/(tabs)/pedidos');
      
      // Se houver um orderId específico e quisermos navegar para ele no futuro
      // if (notification.data?.orderId) {
      //   router.push(`/(auth)/(tabs)/${notification.data.orderId}`);
      // }
    } catch (error) {
      console.error('Erro ao processar notificação:', error);
      Alert.alert('Erro', 'Não foi possível processar a notificação');
    }
  };

  // Função para excluir todas as notificações
  const handleDeleteAllNotifications = async () => {
    try {
      // Mostrar confirmação antes de excluir
      Alert.alert(
        'Excluir todas as notificações',
        'Tem certeza que deseja excluir todas as notificações? Esta ação não pode ser desfeita.',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: async () => {
              try {
                await notificationService.deleteAllNotifications();
                // Não precisamos atualizar o estado local, pois o listener fará isso
                
                Alert.alert('Sucesso', 'Todas as notificações foram excluídas');
              } catch (error) {
                console.error('Erro ao excluir todas as notificações:', error);
                Alert.alert('Erro', 'Não foi possível excluir todas as notificações');
              }
            },
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error('Erro ao excluir todas as notificações:', error);
      Alert.alert('Erro', 'Não foi possível excluir todas as notificações');
    }
  };

  // Renderizar conteúdo baseado no estado
  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      {notifications.length > 0 ? (
        <>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Notificações</Text>
            <TouchableOpacity onPress={handleDeleteAllNotifications} style={styles.deleteAllButton}>
              <Text style={styles.deleteAllText}>Excluir todas</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <NotificationItem
                notification={item}
                onPress={handleNotificationPress}
              />
            )}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            contentContainerStyle={styles.listContent}
          />
        </>
      ) : (
        <EmptyNotifications />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
        color: '#333',
  },
  deleteAllButton: {
    padding: 8,
  },
  deleteAllText: {
    color: '#FF4444',
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    flexGrow: 1,
  },
}); 