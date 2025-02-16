import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

interface PremiumStatus {
  isPremium: boolean;
  premiumExpiresAt: string | null;
  daysRemaining: number;
}

export function usePremium() {
  const { user } = useAuth();
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus>({
    isPremium: false,
    premiumExpiresAt: null,
    daysRemaining: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    console.log('Iniciando listener do premium status para usuário:', user.uid);

    const unsubscribe = onSnapshot(doc(db, 'partners', user.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        console.log('Dados completos do documento:', data);

        // Acessar o campo isPremium diretamente do store
        const store = data.store || {};
        const isPremium = Boolean(store.isPremium);
        const premiumExpiresAt = store.premiumExpiresAt;
        
        console.log('Store:', store);
        console.log('isPremium:', isPremium);
        
        let daysRemaining = 0;
        if (premiumExpiresAt) {
          const expirationDate = new Date(premiumExpiresAt);
          const today = new Date();
          daysRemaining = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
        }

        setPremiumStatus({
          isPremium,
          premiumExpiresAt,
          daysRemaining
        });
      } else {
        setPremiumStatus({
          isPremium: false,
          premiumExpiresAt: null,
          daysRemaining: 0
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return {
    ...premiumStatus,
    loading,
    checkPremiumFeature: (feature: string): boolean => {
      return premiumStatus.isPremium && premiumStatus.daysRemaining > 0;
    }
  };
} 