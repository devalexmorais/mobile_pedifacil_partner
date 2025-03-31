import React, { useEffect, useState } from 'react';
import { PlanProvider } from '@/contexts/PlanContext';
import { premiumService } from '@/services/premiumService';
import { useAuth } from '@/contexts/AuthContext';

interface PremiumProviderProps {
  children: React.ReactNode;
}

export function PremiumProvider({ children }: PremiumProviderProps) {
  const { isAuthenticated } = useAuth();
  const [premiumStatus, setPremiumStatus] = useState({
    isPremium: false,
    expirationDate: undefined,
    features: undefined
  });

  useEffect(() => {
    const loadPremiumStatus = async () => {
      if (!isAuthenticated) return;
      
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
  }, [isAuthenticated]);

  return (
    <PlanProvider 
      isPremium={premiumStatus.isPremium}
      expirationDate={premiumStatus.expirationDate}
      planFeatures={premiumStatus.features}
    >
      {children}
    </PlanProvider>
  );
} 