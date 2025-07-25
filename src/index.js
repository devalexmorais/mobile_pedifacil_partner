import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from '../app.json';
import './messaging_background'; // Importar manipulador de mensagens em segundo plano

// Registrar tarefa em segundo plano para notificações
messaging().setBackgroundMessageHandler(async remoteMessage => {
  // Necessário retornar uma promise
  return Promise.resolve();
});

// Registrar o componente principal
AppRegistry.registerComponent(appName, () => App); 