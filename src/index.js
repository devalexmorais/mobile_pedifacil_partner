import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from '../app.json';

// Registrar componente principal do app
AppRegistry.registerComponent(appName, () => App); 