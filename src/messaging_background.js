/**
 * Módulo para processar mensagens Firebase em segundo plano
 */

import { AppRegistry } from 'react-native';
import * as Notifications from 'expo-notifications';

// Configurar manipulador de notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Esta função será chamada quando uma mensagem FCM for recebida em segundo plano
const FirebaseBackgroundMessageHandler = async (message) => {
  console.log('Mensagem recebida em Headless JS:', message);
  
  try {
    // Exibir notificação local
    await Notifications.scheduleNotificationAsync({
      content: {
        title: message.title || 'Nova notificação',
        body: message.body || '',
        data: message || { screen: 'pedidos' },
        sound: true,
      },
      trigger: null, // mostrar imediatamente
    });
    
    console.log('Notificação agendada com sucesso no background');
  } catch (error) {
    console.error('Erro ao agendar notificação em segundo plano:', error);
  }
  
  // Necessário retornar um valor booleano para indicar conclusão bem-sucedida
  return true;
};

// Registrar o módulo headless
AppRegistry.registerHeadlessTask(
  'FirebaseBackgroundMessageHandler',
  () => FirebaseBackgroundMessageHandler
);

export default FirebaseBackgroundMessageHandler; 