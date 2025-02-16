import { functions } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';

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
  }
}; 