import React, { createContext, useContext, ReactNode } from 'react';

interface PlanFeatures {
  maxProducts: number;
  analytics: 'basic' | 'advanced';
  support: 'email' | 'priority';
  showInPremiumSection: boolean;
  showPromotionsInHome?: boolean;
}

interface PlanLimits {
  maxProducts: number;
}

interface PlanContextData {
  isPremium: boolean;
  getPlanLimits: () => PlanLimits;
  isWithinPlanLimits: (productCount: number) => boolean;
  planExpirationDate?: Date;
}

interface PlanProviderProps {
  children: ReactNode;
  isPremium: boolean;
  expirationDate?: Date;
  planFeatures?: PlanFeatures;
}

const PlanContext = createContext<PlanContextData>({} as PlanContextData);

export function PlanProvider({ 
  children, 
  isPremium, 
  expirationDate,
  planFeatures 
}: PlanProviderProps) {
  const getPlanLimits = (): PlanLimits => {
    // Se for premium, usa -1 (sem limite) conforme definido no Firebase
    // Se não for premium, usa o limite do plano padrão (50) ou 5 como fallback
    return {
      maxProducts: isPremium ? -1 : (planFeatures?.maxProducts || 5),
    };
  };

  const isWithinPlanLimits = (productCount: number): boolean => {
    const limits = getPlanLimits();
    // Se maxProducts for -1, significa que é um usuário premium (sem limite)
    if (limits.maxProducts === -1) return true;
    return productCount < limits.maxProducts;
  };

  return (
    <PlanContext.Provider
      value={{
        isPremium,
        getPlanLimits,
        isWithinPlanLimits,
        planExpirationDate: isPremium ? expirationDate : undefined
      }}
    >
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan(): PlanContextData {
  const context = useContext(PlanContext);

  if (!context) {
    throw new Error('usePlan deve ser usado dentro de um PlanProvider');
  }

  return context;
} 