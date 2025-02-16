import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Verificar se auth está disponível
if (!auth) {
  console.error('Auth não está inicializado!');
}

export const authService = {
  async login(email: string, password: string) {
    try {
      console.log('Iniciando processo de login...');
      
      if (!auth) {
        console.error('Auth não inicializado');
        throw new Error('Serviço de autenticação não inicializado');
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Login realizado com sucesso:', userCredential.user.email);
      
      return userCredential.user;
    } catch (error: any) {
      console.error('Erro no login:', error);
      
      // Tratamento específico de erros
      if (error.code === 'auth/user-not-found') {
        throw new Error('Usuário não encontrado');
      }
      if (error.code === 'auth/wrong-password') {
        throw new Error('Senha incorreta');
      }
      if (error.code === 'auth/invalid-email') {
        throw new Error('Email inválido');
      }
      
      throw new Error(error.message || 'Erro ao realizar login');
    }
  },

  async logout() {
    try {
      // Deslogar do Firebase Auth
      await signOut(auth);
      
      // Limpar dados locais de autenticação
      await AsyncStorage.multiRemove([
        '@user_data',
        '@auth_token',
        '@session'
      ]);

      console.log('Logout realizado com sucesso');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      throw error;
    }
  },

  getCurrentUser() {
    return auth.currentUser;
  },

  isAuthenticated() {
    return !!auth.currentUser;
  },

  async getToken() {
    const user = auth.currentUser;
    if (user) {
      return user.getIdToken();
    }
    return null;
  }
};