import { functions } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export interface PremiumStatus {
  isPremium: boolean;
  expirationDate?: Date;
  features?: {
    maxProducts: number;
    analytics: 'basic' | 'advanced';
    support: 'email' | 'priority';
    showInPremiumSection: boolean;
    showPromotionsInHome?: boolean;
  };
}

export const premiumService = {
  activatePremium: async (establishmentId: string, days: number) => {
    try {
      console.log('Iniciando ativação premium para:', establishmentId);
      console.log('Dias:', days);

      if (!functions) {
        throw new Error('Firebase Functions não está configurado');
      }

      const makePremium = httpsCallable(functions, 'makePremium');
      
      console.log('Chamando função makePremium...');
      const result = await makePremium({
        establishmentId,
        days
      });
      console.log('Resultado da função:', result);

      return result.data;
    } catch (error: any) {
      console.error('Erro detalhado ao ativar premium:', error);
      throw new Error(error.message || 'Não foi possível ativar o plano premium');
    }
  },

  checkPremiumStatus: async (establishmentId: string) => {
    try {
      if (!functions) {
        throw new Error('Firebase Functions não está configurado');
      }

      const checkPremium = httpsCallable(functions, 'checkPremiumStatus');
      const result = await checkPremium({ establishmentId });
      return result.data;
    } catch (error: any) {
      console.error('Erro ao verificar status premium:', error);
      throw new Error(error.message || 'Não foi possível verificar o status premium');
    }
  },

  checkUserPremium: async (): Promise<PremiumStatus> => {
    try {
      const user = auth.currentUser;
      console.log('Usuário atual:', user?.uid);
      
      if (!user) {
        console.log('Nenhum usuário logado');
        return { isPremium: false };
      }

      const userDocRef = doc(db, 'partners', user.uid);
      console.log('Buscando documento:', userDocRef.path);
      
      const userDoc = await getDoc(userDocRef);
      console.log('Documento existe:', userDoc.exists());
      
      const userData = userDoc.data();
      console.log('Dados do usuário:', userData);

      if (!userData) {
        console.log('Nenhum dado encontrado para o usuário');
        return { isPremium: false };
      }

      const isPremium = userData.store?.isPremium || false;
      const premiumExpiresAt = userData.store?.premiumExpiresAt;
      
      console.log('Status Premium:', {
        isPremium,
        premiumExpiresAt,
        storeData: userData.store
      });

      // Verifica se a data de expiração é válida e ainda não expirou
      const expirationDate = premiumExpiresAt ? new Date(premiumExpiresAt) : undefined;
      const isExpired = expirationDate ? expirationDate < new Date() : true;

      console.log('Verificação de expiração:', {
        expirationDate,
        isExpired,
        currentDate: new Date()
      });

      // Se tiver expirado, retorna como não premium
      if (isExpired) {
        console.log('Plano expirado');
        return { isPremium: false };
      }

      const status: PremiumStatus = {
        isPremium: Boolean(isPremium),
        expirationDate: expirationDate,
        features: {
          maxProducts: isPremium ? -1 : 50,
          analytics: isPremium ? 'advanced' as const : 'basic' as const,
          support: isPremium ? 'priority' as const : 'email' as const,
          showInPremiumSection: Boolean(isPremium),
          showPromotionsInHome: Boolean(isPremium)
        }
      };

      console.log('Status final:', status);
      return status;
    } catch (error) {
      console.error('Erro ao verificar status premium:', error);
      return { isPremium: false };
    }
  }
}; 