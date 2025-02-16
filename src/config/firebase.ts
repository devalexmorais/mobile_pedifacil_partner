import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
import { Auth, initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyChPcaHDVCuz6Whhr87xaT-X_3lStqL_Is",
  authDomain: "pedifacil-6e91e.firebaseapp.com",
  databaseURL: "https://pedifacil-6e91e-default-rtdb.firebaseio.com",
  projectId: "pedifacil-6e91e",
  storageBucket: "pedifacil-6e91e.appspot.com",
  messagingSenderId: "247060176018",
  appId: "1:247060176018:web:6a9020775b169151769a4b",
  measurementId: "G-LYP6JFSKHK"
};

// Garantir que o Firebase seja inicializado apenas uma vez
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Inicializar Auth com persistência para React Native
let auth: Auth; 

try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
  console.log('Auth inicializado com persistência');
} catch (error) {
  if (error.code === 'auth/already-initialized') {
    console.log('Auth já estava inicializado, usando instância existente');
    auth = getAuth(app);
  } else {
    console.error('Erro ao inicializar Auth:', error);
    throw error;
  }
}

// Outros serviços
const db = getFirestore(app);
const storage = getStorage(app);
const analytics = !__DEV__ && typeof window !== 'undefined' ? getAnalytics(app) : null;
const functions = getFunctions(app);

// Se estiver em desenvolvimento, conectar ao emulador local
if (__DEV__) {
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

// Logs para debug
console.log('Firebase inicializado:', !!app);
console.log('Auth inicializado:', !!auth);
console.log('Firestore inicializado:', !!db);
console.log('Firebase Storage inicializado:', !!storage);
console.log('Firebase Functions inicializado:', !!functions);
if (analytics) {
  console.log('Firebase Analytics inicializado:', !!analytics);
}

export { db, auth, analytics, storage, functions };
export default app;