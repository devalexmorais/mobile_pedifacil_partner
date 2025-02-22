import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import { PedidosProvider } from '../contexts/PedidosContext';
import { PlanProvider } from '@/contexts/PlanContext';
import { premiumService } from '@/services/premiumService';
import { useEffect, useState } from 'react';

export default function RootLayout() {
  const [premiumStatus, setPremiumStatus] = useState({
    isPremium: false,
    expirationDate: undefined,
    features: undefined
  });

  useEffect(() => {
    const loadPremiumStatus = async () => {
      try {
        console.log('Verificando status premium...');
        const status = await premiumService.checkUserPremium();
        console.log('Status premium recebido:', status);
        setPremiumStatus(status);
      } catch (error) {
        console.error('Erro ao carregar status premium:', error);
      }
    };

    loadPremiumStatus();
  }, []);

  return (
    <AuthProvider>
      <PedidosProvider>
        <PlanProvider 
          isPremium={premiumStatus.isPremium}
          expirationDate={premiumStatus.expirationDate}
          planFeatures={premiumStatus.features}
        >
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="public" options={{ headerShown: false }} />
          </Stack>
        </PlanProvider>
      </PedidosProvider>
    </AuthProvider>
  );
}