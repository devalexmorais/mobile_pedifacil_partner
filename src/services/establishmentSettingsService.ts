import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

// Tipos para as configurações
export type CardFlag = {
  name: string;
  enabled: boolean;
  fee: string;
};

export type ScheduleDay = {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
};

export type Schedule = {
  segunda: ScheduleDay;
  terca: ScheduleDay;
  quarta: ScheduleDay;
  quinta: ScheduleDay;
  sexta: ScheduleDay;
  sabado: ScheduleDay;
  domingo: ScheduleDay;
};

export const establishmentSettingsService = {
  // Salvar bandeiras de cartão aceitas pelo estabelecimento
  async saveCardFlags(cardFlags: CardFlag[]) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');

      const partnerRef = doc(db, 'partners', user.uid);
      await updateDoc(partnerRef, {
        'settings.paymentOptions.cardFlags': cardFlags,
        lastUpdated: new Date().toISOString()
      });

      console.log('Bandeiras de cartão atualizadas com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao salvar bandeiras de cartão:', error);
      throw error;
    }
  },

  // Buscar bandeiras de cartão do estabelecimento
  async getCardFlags(): Promise<CardFlag[]> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');

      const partnerRef = doc(db, 'partners', user.uid);
      const partnerDoc = await getDoc(partnerRef);

      if (partnerDoc.exists()) {
        const data = partnerDoc.data();
        return data.settings?.paymentOptions?.cardFlags || [];
      }

      return [];
    } catch (error) {
      console.error('Erro ao buscar bandeiras de cartão:', error);
      throw error;
    }
  },

  // Salvar tempo de entrega
  async saveDeliveryTime(minTime: string, maxTime: string) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');

      const partnerRef = doc(db, 'partners', user.uid);
      await updateDoc(partnerRef, {
        'settings.delivery.minTime': minTime,
        'settings.delivery.maxTime': maxTime,
        lastUpdated: new Date().toISOString()
      });

      console.log('Tempo de entrega atualizado com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao salvar tempo de entrega:', error);
      throw error;
    }
  },

  // Buscar tempo de entrega
  async getDeliveryTime(): Promise<{minTime: string, maxTime: string}> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');

      const partnerRef = doc(db, 'partners', user.uid);
      const partnerDoc = await getDoc(partnerRef);

      if (partnerDoc.exists()) {
        const data = partnerDoc.data();
        return {
          minTime: data.settings?.delivery?.minTime || '30',
          maxTime: data.settings?.delivery?.maxTime || '45'
        };
      }

      return { minTime: '30', maxTime: '45' };
    } catch (error) {
      console.error('Erro ao buscar tempo de entrega:', error);
      throw error;
    }
  },

  // Salvar configurações de retirada
  async savePickupSettings(allowPickup: boolean, pickupTime: string) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');

      const partnerRef = doc(db, 'partners', user.uid);
      await updateDoc(partnerRef, {
        'settings.pickup.enabled': allowPickup,
        'settings.pickup.estimatedTime': pickupTime,
        lastUpdated: new Date().toISOString()
      });

      console.log('Configurações de retirada atualizadas com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao salvar configurações de retirada:', error);
      throw error;
    }
  },

  // Buscar configurações de retirada
  async getPickupSettings(): Promise<{enabled: boolean, estimatedTime: string}> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');

      const partnerRef = doc(db, 'partners', user.uid);
      const partnerDoc = await getDoc(partnerRef);

      if (partnerDoc.exists()) {
        const data = partnerDoc.data();
        return {
          enabled: data.settings?.pickup?.enabled ?? true,
          estimatedTime: data.settings?.pickup?.estimatedTime || '15'
        };
      }

      return { enabled: true, estimatedTime: '15' };
    } catch (error) {
      console.error('Erro ao buscar configurações de retirada:', error);
      throw error;
    }
  },

  // Salvar horários de funcionamento
  async saveSchedule(schedule: Schedule) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');

      const partnerRef = doc(db, 'partners', user.uid);
      await updateDoc(partnerRef, {
        'settings.schedule': schedule,
        lastUpdated: new Date().toISOString()
      });

      console.log('Horários de funcionamento atualizados com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao salvar horários de funcionamento:', error);
      throw error;
    }
  },

  // Buscar horários de funcionamento
  async getSchedule(): Promise<Schedule> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');

      const partnerRef = doc(db, 'partners', user.uid);
      const partnerDoc = await getDoc(partnerRef);

      const defaultSchedule: Schedule = {
        segunda: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
        terca: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
        quarta: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
        quinta: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
        sexta: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
        sabado: { isOpen: true, openTime: '08:00', closeTime: '12:00' },
        domingo: { isOpen: false, openTime: '00:00', closeTime: '00:00' }
      };

      if (partnerDoc.exists()) {
        const data = partnerDoc.data();
        return data.settings?.schedule || defaultSchedule;
      }

      return defaultSchedule;
    } catch (error) {
      console.error('Erro ao buscar horários de funcionamento:', error);
      throw error;
    }
  },

  // Inicializar as configurações do estabelecimento se necessário
  async initializeSettings() {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');

      const partnerRef = doc(db, 'partners', user.uid);
      const partnerDoc = await getDoc(partnerRef);

      if (partnerDoc.exists()) {
        const data = partnerDoc.data();
        
        // Se não existir o objeto de configurações, cria ele com valores padrão
        if (!data.settings) {
          const defaultSettings = {
            paymentOptions: {
              cardFlags: [
                { name: 'Visa', enabled: true, fee: '2.5' },
                { name: 'Mastercard', enabled: true, fee: '2.8' },
                { name: 'Elo', enabled: true, fee: '3.0' },
                { name: 'American Express', enabled: false, fee: '3.5' },
                { name: 'Hipercard', enabled: false, fee: '3.2' }
              ]
            },
            delivery: {
              minTime: '30',
              maxTime: '45'
            },
            pickup: {
              enabled: true,
              estimatedTime: '15'
            },
            schedule: {
              segunda: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
              terca: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
              quarta: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
              quinta: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
              sexta: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
              sabado: { isOpen: true, openTime: '08:00', closeTime: '12:00' },
              domingo: { isOpen: false, openTime: '00:00', closeTime: '00:00' }
            }
          };

          await updateDoc(partnerRef, {
            settings: defaultSettings,
            lastUpdated: new Date().toISOString()
          });

          console.log('Configurações do estabelecimento inicializadas com sucesso');
        }
      }
    } catch (error) {
      console.error('Erro ao inicializar configurações do estabelecimento:', error);
      throw error;
    }
  }
}; 