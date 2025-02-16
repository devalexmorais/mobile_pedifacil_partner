import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import { PedidosProvider } from '../contexts/PedidosContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <PedidosProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="public" options={{ headerShown: false }} />
        </Stack>
      </PedidosProvider>
    </AuthProvider>
  );
}