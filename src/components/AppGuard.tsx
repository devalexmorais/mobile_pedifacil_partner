import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { usePaymentStatus } from '@/hooks/usePaymentStatus';
import { useEstablishment } from '@/contexts/EstablishmentContext';

interface AppGuardProps {
  children: React.ReactNode;
}

export function AppGuard({ children }: AppGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { paymentStatus, loading } = usePaymentStatus();
  const { isBlocked: contextBlocked } = useEstablishment();

  // Combina o bloqueio do contexto com o do payment status
  const isBlocked = contextBlocked || paymentStatus.isBlocked;

  // Rotas permitidas mesmo quando bloqueado
  const allowedRoutes = [
    '/faturas',
    '/faturas/[id]',
    '/login',
    '/auth',
    '/profile',
    '/logout'
  ];

  const isRouteAllowed = (currentPath: string) => {
    return allowedRoutes.some(route => {
      // Permite rota exata
      if (route === currentPath) return true;
      
      // Permite rotas dinâmicas como /faturas/[id]
      if (route.includes('[') && route.includes(']')) {
        const routePattern = route.replace(/\[.*?\]/g, '.*');
        const regex = new RegExp(`^${routePattern}$`);
        return regex.test(currentPath);
      }
      
      // Permite subrotas (ex: /faturas/pagamento)
      if (currentPath.startsWith(route)) return true;
      
      return false;
    });
  };

  // Redireciona automaticamente se o app estiver bloqueado e não estiver em rota permitida
  useEffect(() => {
    if (!loading && isBlocked && !isRouteAllowed(pathname)) {
      // Redireciona para faturas quando bloqueado
      router.replace('/faturas' as any);
    }
  }, [isBlocked, pathname, loading, router]);

  // Ainda carregando status de pagamento
  if (loading) {
    return <>{children}</>;
  }

  // App liberado ou rota permitida - mostra conteúdo normal
  return <>{children}</>;
} 