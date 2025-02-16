import { useState, useEffect } from 'react';

interface PaymentStatus {
  isBlocked: boolean;
  dueAmount: number;
  dueDate: string;
  blockedSince?: string;
}

export function usePaymentStatus() {
  const [status, setStatus] = useState<PaymentStatus>({
    isBlocked: false,
    dueAmount: 0,
    dueDate: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  const checkPaymentStatus = async () => {
    try {
      setIsLoading(true);
      
      const response = await new Promise<PaymentStatus>((resolve) => {
        setTimeout(() => {
          // Simulando boleto em dia
          resolve({
            isBlocked: false,
            dueAmount: 2280.00,
            dueDate: '10/04/2024',
            blockedSince: undefined
          });
        }, 1000);
      });
      
      setStatus(response);
    } catch (error) {
      console.error('Erro ao verificar status do pagamento:', error);
      setStatus(prev => ({ ...prev, isBlocked: false }));
    } finally {
      setIsLoading(false);
    }
  };

  // Verifica o status ao montar o componente
  useEffect(() => {
    checkPaymentStatus();
  }, []);

  // Verifica o status periodicamente (a cada 5 minutos)
  useEffect(() => {
    const interval = setInterval(checkPaymentStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Aqui você implementaria a lógica real de verificação
    // Por enquanto, vamos simular
    setIsPremium(false);
    setIsLoading(false);
  }, []);

  return {
    ...status,
    isLoading,
    checkPaymentStatus,
    isPremium,
  };
} 