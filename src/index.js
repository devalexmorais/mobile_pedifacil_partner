import { AppRegistry } from 'react-native';
import { setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from '../app.json';
import './messaging_background'; // Importar manipulador de mensagens em segundo plano

// Registrar tarefa em segundo plano para notificações
// Esta configuração será feita no messaging_background.js

AppRegistry.registerComponent(appName, () => App); 