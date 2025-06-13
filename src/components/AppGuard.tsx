import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { usePaymentStatus } from '@/hooks/usePaymentStatus';
import { AppBlockedScreen } from './AppBlockedScreen';

interface AppGuardProps {
  children: React.ReactNode;
}

export function AppGuard({ children }: AppGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { 
    isAppBlocked, 
    isBlocked,
    dueAmount, 
    dueDate, 
    suspensionReason, 
    blockedSince, 
    overdueCount, 
    daysOverdue,
    isLoading 
  } = usePaymentStatus();

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
    if (!isLoading && isAppBlocked && !isRouteAllowed(pathname)) {
      console.log('🚫 App bloqueado! Redirecionando para faturas...');
      console.log('📍 Rota atual:', pathname);
      console.log('🔒 Dias em atraso:', daysOverdue);
      
      // Redireciona para faturas com flag de bloqueio
      router.replace('/faturas?blocked=true');
    }
  }, [isAppBlocked, pathname, isLoading, router, daysOverdue]);

  // Ainda carregando status de pagamento
  if (isLoading) {
    return <>{children}</>;
  }

  // Se o app está bloqueado e não está em rota permitida, mostra tela de bloqueio
  if (isAppBlocked && !isRouteAllowed(pathname)) {
    console.log('🚫 Mostrando tela de bloqueio completo');
    
    return (
      <AppBlockedScreen
        dueAmount={dueAmount}
        dueDate={dueDate}
        suspensionReason={suspensionReason}
        blockedSince={blockedSince}
        overdueCount={overdueCount}
        daysOverdue={daysOverdue}
      />
    );
  }

  // App liberado ou rota permitida - mostra conteúdo normal
  console.log('✅ App liberado ou rota permitida:', pathname);
  return <>{children}</>;
} 