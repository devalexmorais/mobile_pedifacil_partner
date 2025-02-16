import { firebaseAuth, db } from '@/config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LoginData {
  email: string;
  password: string;
}

export interface Seller {
  id: string;
  email: string;
  name: string;
  phone: string;
  cityId: string;
  districtId: string;
  street: string;
  number: string;
  complement: string;
  mainCategoryId: string;
  subCategoryId: string;
  storeName: string;
  cnpj_or_cpf: string;
  logo: string | null;
  coverImage: string | null;
  isOpen: boolean;
  isBlocked: boolean;
  minimumOrderValue: string;
  isPremium: boolean;
  rating: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  allowsPickup: boolean;
  openingHours: string | null;
  estimated_delivery_time: string | null;
}

export interface RegisterStep1Data {
  email: string;
  password: string;
  name: string;
  storeName: string;
  mainCategoryId: string;
  subCategoryId: string;
}

export interface RegisterStep2Data {
  token: string;
  phone: string;
  cityId: string;
  districtId: string;
  street: string;
  number: string;
  complement: string;
  cnpj_or_cpf: string;
}

export interface AuthResponse {
  seller: Seller;
  token: string;
}

type TokenListener = (token: string | null) => void;
const tokenListeners: TokenListener[] = [];

export const firebaseAuthService = {
  addTokenListener(listener: TokenListener) {
    tokenListeners.push(listener);
    return () => {
      const index = tokenListeners.indexOf(listener);
      if (index > -1) {
        tokenListeners.splice(index, 1);
      }
    };
  },

  async login(data: LoginData): Promise<AuthResponse> {
    try {
      const userCredential = await firebaseAuth.signInWithEmailAndPassword(data.email, data.password);
      const token = await userCredential.user.getIdToken();
      
      const sellerDoc = await db.collection('sellers').doc(userCredential.user.uid).get();
      if (!sellerDoc.exists) {
        throw new Error('Vendedor não encontrado');
      }

      const seller = { id: sellerDoc.id, ...sellerDoc.data() } as Seller;

      await AsyncStorage.setItem('@auth_token', token);
      await AsyncStorage.setItem('@user_data', JSON.stringify(seller));

      tokenListeners.forEach(listener => listener(token));

      return { seller, token };
    } catch (error: any) {
      console.error('Erro no login:', error);
      throw new Error('Falha ao fazer login. Verifique suas credenciais.');
    }
  },

  async registerStep1(data: RegisterStep1Data): Promise<{ token: string }> {
    try {
      const userCredential = await firebaseAuth.createUserWithEmailAndPassword(data.email, data.password);
      const token = await userCredential.user.getIdToken();

      // Salva os dados iniciais do vendedor
      await db.collection('sellers').doc(userCredential.user.uid).set({
        email: data.email,
        name: data.name,
        storeName: data.storeName,
        mainCategoryId: data.mainCategoryId,
        subCategoryId: data.subCategoryId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        isBlocked: false,
        isPremium: false,
        isOpen: false,
      });

      return { token };
    } catch (error) {
      console.error('Erro no registerStep1:', error);
      throw new Error('Erro ao realizar o cadastro');
    }
  },

  async registerStep2(data: RegisterStep2Data): Promise<AuthResponse> {
    try {
      const currentUser = firebaseAuth.currentUser;
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }

      const sellerRef = db.collection('sellers').doc(currentUser.uid);
      
      // Atualiza os dados do vendedor
      await sellerRef.update({
        phone: data.phone,
        cityId: data.cityId,
        districtId: data.districtId,
        street: data.street,
        number: data.number,
        complement: data.complement,
        cnpj_or_cpf: data.cnpj_or_cpf,
        updatedAt: new Date().toISOString(),
      });

      const token = await currentUser.getIdToken();
      const sellerDoc = await sellerRef.get();
      const seller = { id: sellerDoc.id, ...sellerDoc.data() } as Seller;

      await AsyncStorage.setItem('@auth_token', token);
      await AsyncStorage.setItem('@user_data', JSON.stringify(seller));

      tokenListeners.forEach(listener => listener(token));

      return { seller, token };
    } catch (error) {
      console.error('Erro no registerStep2:', error);
      throw new Error('Erro ao completar o cadastro');
    }
  },

  async sendPhoneCode(phone: string): Promise<void> {
    // Implementar depois
  },

  async verifyPhoneCode(phone: string, code: string): Promise<void> {
    // Implementar depois
  },

  async getToken() {
    return await AsyncStorage.getItem('@auth_token');
  },

  async signOut() {
    try {
      await firebaseAuth.signOut();
      await AsyncStorage.removeItem('@auth_token');
      await AsyncStorage.removeItem('@user_data');
      tokenListeners.forEach(listener => listener(null));
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      throw new Error('Erro ao fazer logout');
    }
  }
};

export default firebaseAuthService; 