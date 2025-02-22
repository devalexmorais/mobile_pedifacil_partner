import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

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

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa Auth e Firestore normalmente
export const auth = getAuth(app);
export const db = getFirestore(app);

// Inicializa Analytics apenas se suportado
export const analytics = async () => {
  try {
    if (await isSupported()) {
      return getAnalytics(app);
    }
    return null;
  } catch (error) {
    console.log('Analytics não suportado nesta plataforma');
    return null;
  }
};

export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;