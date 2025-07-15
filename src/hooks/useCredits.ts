import { useState, useEffect } from 'react';
import { creditService, CreditSummary } from '../services/creditService';
import { useAuth } from '../contexts/AuthContext';

export const useCredits = () => {
  const { user } = useAuth();
  const [creditSummary, setCreditSummary] = useState<CreditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCredits = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      setError(null);
      const summary = await creditService.getCreditSummary(user.uid);
      setCreditSummary(summary);
    } catch (err) {
      console.error('Erro ao carregar créditos:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar créditos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCredits();
  }, [user]);

  const refreshCredits = () => {
    loadCredits();
  };

  return {
    creditSummary,
    loading,
    error,
    refreshCredits
  };
}; 