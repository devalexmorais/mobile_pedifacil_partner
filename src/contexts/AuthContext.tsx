import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { auth } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  userData: any | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  userData: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('@auth_token');
        const storedUserData = await AsyncStorage.getItem('@user_data');

        if (storedUserData) {
          setUserData(JSON.parse(storedUserData));
        }

        if (!token) {
          setLoading(false);
          router.replace('/');
          return;
        }

        // Aguarda um pequeno delay para garantir que o Firebase esteja pronto
        setTimeout(() => {
          if (auth.currentUser) {
            router.replace('/(auth)/(tabs)/pedidos');
          }
        }, 1000);
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        setLoading(false);
        router.replace('/');
      }
    };

    // Monitorar mudanças no estado de autenticação
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Estado de autenticação alterado:', !!user);
      
      if (user) {
        try {
          // Atualizar token quando o usuário estiver autenticado
          const token = await user.getIdToken();
          await AsyncStorage.setItem('@auth_token', token);
          
          // Aguarda um pequeno delay para garantir que o Firebase esteja pronto
          setTimeout(() => {
            router.replace('/(auth)/(tabs)/pedidos');
          }, 1000);
        } catch (error) {
          console.error('Erro ao atualizar token:', error);
          router.replace('/');
        }
      } else {
        // Se não estiver autenticado, redireciona para a tela inicial
        router.replace('/');
      }
      
      setUser(user);
      setLoading(false);
    });

    // Verificar autenticação inicial
    checkAuthStatus();

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated: !!user,
      userData,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext); 