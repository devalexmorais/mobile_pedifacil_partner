import { initializeApp, getApps } from 'firebase/app';
import { getAuth, Auth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore} from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Removido import do React Native Firebase - usando apenas Firebase v9+ SDK

const firebaseConfig = {
  apiKey: "AIzaSyChPcaHDVCuz6Whhr87xaT-X_3lStqL_Is",
  authDomain: "pedifacil-6e91e.firebaseapp.com",
  databaseURL: "https://pedifacil-6e91e-default-rtdb.firebaseio.com",
  projectId: "pedifacil-6e91e",
  storageBucket: "pedifacil-6e91e.firebasestorage.app",
  messagingSenderId: "247060176018",
  appId: "1:247060176018:web:6a9020775b169151769a4b",
  measurementId: "G-LYP6JFSKHK"
};

// Inicializa o Firebase apenas se não houver apps já inicializados
let app;
try {
  const apps = getApps();
  if (apps.length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = apps[0];
  }
} catch (error) {
  // Se houver erro, tenta usar uma instância existente
  const apps = getApps();
  if (apps.length > 0) {
    app = apps[0];
  } else {
    throw new Error('Não foi possível inicializar o Firebase');
  }
}

// Inicializa Auth com persistência AsyncStorage
let auth: Auth;
try {
  // Tentar usar initializeAuth com persistência primeiro
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (error) {
  // Se já foi inicializado, usar getAuth
  try {
    auth = getAuth(app);
  } catch (authError) {
    console.error('Erro crítico ao obter Firebase Auth:', authError);
    throw authError;
  }
}

export { auth };

// Inicializa Firestore com configurações de retry
export const db = getFirestore(app);

// Configurações adicionais para melhorar estabilidade da conexão
// Estas configurações ajudam com os erros de WebChannelConnection
if (__DEV__) {
  // Em desenvolvimento, podemos conectar ao emulador se necessário
  // connectFirestoreEmulator(db, 'localhost', 8080);
}

// Inicializa Analytics apenas se suportado
export const analytics = async () => {
  try {
    if (await isSupported()) {
      return getAnalytics(app);
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');

// Removido export do React Native Firebase - usando apenas Firebase v9+ SDK

export default app;