import { Stack } from 'expo-router';
import { Provider as PaperProvider } from 'react-native-paper';
import { AuthProvider } from '../contexts/AuthContext';
import { PedidosProvider } from '../contexts/PedidosContext';
import { PremiumProvider } from '@/components/PremiumProvider';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

// Manter a splash screen visível enquanto o app carrega
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // Esconder a splash screen quando o app estiver pronto
    const hideSplash = async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (error) {
        console.log('Erro ao esconder splash screen:', error);
      }
    };
    
    // Aguardar um pouco mais para garantir que tudo carregou
    const timer = setTimeout(hideSplash, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <PaperProvider>
      <AuthProvider>
        <PedidosProvider>
          <PremiumProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="index" options={{ headerShown: false }} />
            </Stack>
          </PremiumProvider>
        </PedidosProvider>
      </AuthProvider>
    </PaperProvider>
  );
}