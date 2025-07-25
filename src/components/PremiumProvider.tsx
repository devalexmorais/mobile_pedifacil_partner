import React, { useEffect, useState } from 'react';
import { PlanProvider } from '@/contexts/PlanContext';
import { premiumService, PremiumStatus } from '@/services/premiumService';
import { useAuth } from '@/contexts/AuthContext';

interface PremiumProviderProps {
  children: React.ReactNode;
}

export function PremiumProvider({ children }: PremiumProviderProps) {
  const { isAuthenticated } = useAuth();
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus>({
    isPremium: false
  });

  useEffect(() => {
    const loadPremiumStatus = async () => {
      if (!isAuthenticated) return;
      
      try {
        const status = await premiumService.checkUserPremium();
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