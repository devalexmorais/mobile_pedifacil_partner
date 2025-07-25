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
  const { paymentStatus, loading } = usePaymentStatus();

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
    if (!loading && paymentStatus.isBlocked && !isRouteAllowed(pathname)) {
      // Redireciona para faturas com flag de bloqueio
      router.replace('/faturas' as any);
    }
  }, [paymentStatus.isBlocked, pathname, loading, router]);

  // Ainda carregando status de pagamento
  if (loading) {
    return <>{children}</>;
  }

  // Se o app está bloqueado e não está em rota permitida, mostra tela de bloqueio
  if (paymentStatus.isBlocked && !isRouteAllowed(pathname)) {
    return (
      <AppBlockedScreen
        dueAmount={paymentStatus.overdueInvoice?.amount || 0}
        dueDate={paymentStatus.overdueInvoice?.endDate?.toDate?.() || new Date()}
        suspensionReason={paymentStatus.blockingMessage}
        blockedSince={paymentStatus.overdueInvoice?.endDate?.toDate?.() || new Date()}
        overdueCount={1}
        daysOverdue={paymentStatus.daysPastDue}
      />
    );
  }

  // App liberado ou rota permitida - mostra conteúdo normal
  return <>{children}</>;
} 