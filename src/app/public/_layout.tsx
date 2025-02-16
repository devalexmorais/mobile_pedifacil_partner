import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { RegisterProvider } from './register/context';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';

export default function PublicLayout() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(auth)/(tabs)/pedidos');
    }
  }, [isAuthenticated]);

  return (
    <RegisterProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="Login"
          options={{
            title: 'Login',
          }}
        />
        <Stack.Screen
          name="register/basic-info"
          options={{
            title: 'Cadastro',
          }}
        />
        <Stack.Screen
          name="register/address"
          options={{
            title: 'Endereço',
          }}
        />
        <Stack.Screen
          name="register/documents"
          options={{
            title: 'Documentação',
          }}
        />
      </Stack>
    </RegisterProvider>
  );
} 