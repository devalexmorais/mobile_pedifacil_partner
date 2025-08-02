import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { auth } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('@auth_token');
        const storedUserData = await AsyncStorage.getItem('@user_data');

        if (storedUserData) {
          setUserData(JSON.parse(storedUserData));
        }

        // Verificar se há usuário autenticado no Firebase
        const currentUser = auth.currentUser;
        
        if (currentUser) {
          // Se há usuário autenticado, atualizar token se necessário
          if (!token) {
            const newToken = await currentUser.getIdToken();
            await AsyncStorage.setItem('@auth_token', newToken);
          }
          setUser(currentUser);
        } else if (token) {
          // Se há token mas não há usuário, pode ser um token inválido
          // Aguardar o onAuthStateChanged para verificar
          console.log('Token encontrado mas usuário não autenticado, aguardando verificação...');
        }

        // Aguardar um pouco mais para o Firebase inicializar completamente
        setTimeout(() => {
          setLoading(false);
        }, 1500); // Delay de 1.5 segundos para garantir que o Firebase esteja pronto
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        setLoading(false);
      }
    };

    // Monitorar mudanças no estado de autenticação
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('onAuthStateChanged chamado:', user ? 'Usuário autenticado' : 'Usuário não autenticado');
      
      if (user) {
        try {
          // Atualizar token quando o usuário estiver autenticado
          const token = await user.getIdToken();
          await AsyncStorage.setItem('@auth_token', token);
          
          // Atualizar dados do usuário se necessário
          const storedUserData = await AsyncStorage.getItem('@user_data');
          if (!storedUserData) {
            // Se não há dados do usuário, criar um básico
            const userData = {
              id: user.uid,
              email: user.email,
            };
            await AsyncStorage.setItem('@user_data', JSON.stringify(userData));
            setUserData(userData);
          }
        } catch (error) {
          console.error('Erro ao atualizar token:', error);
        }
      } else {
        // Se não estiver autenticado, limpar dados
        await AsyncStorage.removeItem('@auth_token');
        await AsyncStorage.removeItem('@user_data');
        setUserData(null);
      }
      
      setUser(user);
      // Não definir loading como false aqui, deixar o checkAuthStatus fazer isso
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