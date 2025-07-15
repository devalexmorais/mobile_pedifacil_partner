import { Stack } from 'expo-router';
import { Provider as PaperProvider } from 'react-native-paper';
import { AuthProvider } from '../contexts/AuthContext';
import { PedidosProvider } from '../contexts/PedidosContext';
import { PremiumProvider } from '@/components/PremiumProvider';

export default function RootLayout() {
  return (
    <PaperProvider>
      <AuthProvider>
        <PedidosProvider>
          <PremiumProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="public" options={{ headerShown: false }} />
            </Stack>
          </PremiumProvider>
        </PedidosProvider>
      </AuthProvider>
    </PaperProvider>
  );
}