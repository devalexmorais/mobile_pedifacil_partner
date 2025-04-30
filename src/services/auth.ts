import { auth } from '@/config/firebase';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  PhoneAuthProvider,
  User as FirebaseUser
} from 'firebase/auth';
import { establishmentService } from './establishmentService';

export type User = {
  id: string;
  name: string | null;
  email: string | null;
  storeName?: string;
  phone?: string;
  mainCategoryId?: string;
  subCategoryId?: string;
  cnpj_or_cpf?: string;
  address?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
};

export type StoreRegistrationData = {
  email: string;
  password: string;
  name: string;
  storeName: string;
  phone: string;
  mainCategoryId: string;
  subCategoryId: string;
  cnpj_or_cpf: string;
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
};

type TokenListener = (token: string | null) => void;
const tokenListeners: TokenListener[] = [];

export const authService = {
  async login({ email, password }: { email: string; password: string }): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const { user } = userCredential;

      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      const userDoc = await firestore().collection('stores').doc(user.uid).get();
      const userData = userDoc.data() as Omit<User, 'id'>;

      if (!userData) {
        throw new Error('Dados do usuário não encontrados');
      }

      const token = await user.getIdToken();
      await AsyncStorage.setItem('@auth_token', token);
      await AsyncStorage.setItem('@user_data', JSON.stringify({ id: user.uid, ...userData }));

      // Notificar os listeners sobre a mudança no token
      tokenListeners.forEach(listener => listener(token));

      return {
        id: user.uid,
        ...userData
      };
    } catch (error: any) {
      console.error('Erro no login:', error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        throw new Error('Email ou senha inválidos');
      }
      throw new Error('Erro ao fazer login');
    }
  },

  async logout(): Promise<void> {
    try {
      // Para a verificação automática do status do estabelecimento
      establishmentService.stopAutoStatusCheck();
      
      await signOut(auth);
      await AsyncStorage.removeItem('@auth_token');
      await AsyncStorage.removeItem('@user_data');
      
      // Notificar os listeners sobre o logout
      tokenListeners.forEach(listener => listener(null));
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      throw new Error('Erro ao fazer logout');
    }
  },

  async createUser(data: StoreRegistrationData): Promise<User> {
    try {
      const { email, password, ...userData } = data;
      
      // Criar usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const { user } = userCredential;

      if (!user) {
        throw new Error('Erro ao criar usuário');
      }

      // Salvar dados adicionais no Firestore
      await firestore().collection('stores').doc(user.uid).set({
        ...userData,
        email: user.email,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      const token = await user.getIdToken();
      await AsyncStorage.setItem('@auth_token', token);
      await AsyncStorage.setItem('@user_data', JSON.stringify({ id: user.uid, email: user.email, ...userData }));

      // Notificar os listeners sobre o novo token
      tokenListeners.forEach(listener => listener(token));

      return {
        id: user.uid,
        email: user.email,
        ...userData,
      };
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Este email já está em uso');
      }
      throw new Error('Erro ao criar usuário');
    }
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const user = auth.currentUser;
      
      if (!user) {
        // Tentar recuperar do AsyncStorage
        const storedUser = await AsyncStorage.getItem('@user_data');
        if (storedUser) {
          return JSON.parse(storedUser);
        }
        return null;
      }

      const userDoc = await firestore().collection('stores').doc(user.uid).get();
      const userData = userDoc.data() as Omit<User, 'id'>;

      if (!userData) {
        return null;
      }

      const currentUser = {
        id: user.uid,
        ...userData,
      };

      // Atualizar AsyncStorage
      await AsyncStorage.setItem('@user_data', JSON.stringify(currentUser));

      return currentUser;
    } catch (error) {
      console.error('Erro ao obter usuário atual:', error);
      return null;
    }
  },

  onAuthStateChanged(callback: (user: User | null) => void) {
    return firebaseOnAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await firestore().collection('stores').doc(firebaseUser.uid).get();
        const userData = userDoc.data() as Omit<User, 'id'>;

        const user = {
          id: firebaseUser.uid,
          ...userData,
        };

        // Atualizar AsyncStorage
        await AsyncStorage.setItem('@user_data', JSON.stringify(user));
        const token = await firebaseUser.getIdToken();
        await AsyncStorage.setItem('@auth_token', token);

        callback(user);
      } else {
        // Limpar dados do AsyncStorage
        await AsyncStorage.removeItem('@user_data');
        await AsyncStorage.removeItem('@auth_token');
        callback(null);
      }
    });
  },

  async getToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem('@auth_token');
      if (!token) {
        const user = auth.currentUser;
        if (user) {
          const newToken = await user.getIdToken();
          await AsyncStorage.setItem('@auth_token', newToken);
          return newToken;
        }
      }
      return token;
    } catch (error) {
      console.error('Erro ao obter token:', error);
      return null;
    }
  },

  addTokenListener(listener: TokenListener) {
    tokenListeners.push(listener);
    return () => {
      const index = tokenListeners.indexOf(listener);
      if (index > -1) {
        tokenListeners.splice(index, 1);
      }
    };
  },

  async sendPhoneVerificationCode(phoneNumber: string): Promise<void> {
    try {
      // Implementar verificação de telefone usando o método apropriado do Firebase
      // Esta funcionalidade pode precisar ser implementada de forma diferente
      // dependendo da versão do Firebase que você está usando
      throw new Error('Verificação de telefone não implementada');
    } catch (error: any) {
      console.error('Erro ao enviar código:', error);
      throw new Error('Erro ao enviar código de verificação');
    }
  },

  async verifyPhoneCode(code: string): Promise<void> {
    try {
      // Implementar verificação de código de telefone usando o método apropriado do Firebase
      // Esta funcionalidade pode precisar ser implementada de forma diferente
      // dependendo da versão do Firebase que você está usando
      throw new Error('Verificação de código de telefone não implementada');
    } catch (error: any) {
      console.error('Erro ao verificar código:', error);
      throw new Error('Erro ao verificar código');
    }
  },
};