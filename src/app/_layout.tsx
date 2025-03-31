import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import { PedidosProvider } from '../contexts/PedidosContext';
import { PremiumProvider } from '@/components/PremiumProvider';

export default function RootLayout() {
  return (
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
  );
}