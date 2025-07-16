import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { getAuth } from 'firebase/auth';

export interface Schedule {
  [key: string]: {
    isOpen: boolean;
    openTime: string;
    closeTime: string;
  };
}

interface PaymentMethod {
  type: string;
  enabled: boolean;
}

interface CardBrands {
  visa: boolean;
  mastercard: boolean;
  elo: boolean;
  amex: boolean;
  hipercard: boolean;
}

interface PaymentOptions {
  cartao: PaymentMethod & {
    brands: CardBrands;
  };
  dinheiro: PaymentMethod;
  pix: PaymentMethod;
}

export const establishmentSettingsService = {
  async initializeSettings() {
    try {
      const currentUser = auth.currentUser || getAuth().currentUser;
      
      if (!currentUser) {
        console.log('Nenhum usuário autenticado para inicializar configurações');
        return;
      }
      
      const uid = currentUser.uid;
      console.log('Inicializando configurações para o parceiro:', uid);
      
      const partnerRef = doc(db, 'partners', uid);
      const partnerSnap = await getDoc(partnerRef);
      
      if (!partnerSnap.exists()) {
        console.log('Parceiro não encontrado no Firestore');
        return;
      }
      
      const partnerData = partnerSnap.data();
      
      if (!partnerData.settings) {
        console.log('Configurações não encontradas, utilizando padrões do registro');
        
        const defaultSettings = {
          delivery: {
            enabled: true,
            maxTime: '45',
            minTime: '20',
            minimumOrderAmount: '20',
          },
          pickup: {
            enabled: true,
            estimatedTime: '15',
          },
          paymentOptions: {
            dinheiro: { type: 'Dinheiro', enabled: true },
            pix: { type: 'PIX', enabled: true },
            cartao: { 
              type: 'Cartão', 
              enabled: true,
              brands: {
                visa: true,
                mastercard: true,
                elo: false,
                amex: false,
                hipercard: false,
              }
            },
          },
          schedule: {
            domingo: { isOpen: false, openTime: '00:00', closeTime: '00:00' },
            segunda: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
            terca: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
            quarta: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
            quinta: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
            sexta: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
            sabado: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
          }
        };
        
        await setDoc(partnerRef, { settings: defaultSettings }, { merge: true });
        console.log('Configurações padrão inicializadas com sucesso');
        return defaultSettings;
      }
      
      console.log('Configurações já existem para este parceiro');
      return partnerData.settings;
    } catch (error) {
      console.error('Erro ao inicializar configurações:', error);
      throw error;
    }
  },

  async getPickupSettings() {
    try {
      const currentUser = auth.currentUser || getAuth().currentUser;
      
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }
      
      const uid = currentUser.uid;
      const partnerRef = doc(db, 'partners', uid);
      const partnerSnap = await getDoc(partnerRef);
      
      if (!partnerSnap.exists()) {
        throw new Error('Parceiro não encontrado');
      }
      
      const partnerData = partnerSnap.data();
      
      if (!partnerData.settings || !partnerData.settings.pickup) {
        return {
          enabled: true,
          estimatedTime: '15'
        };
      }
      
      return partnerData.settings.pickup;
    } catch (error) {
      console.error('Erro ao carregar configurações de retirada:', error);
      throw error;
    }
  },

  async getDeliveryTime() {
    try {
      const currentUser = auth.currentUser || getAuth().currentUser;
      
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }
      
      const uid = currentUser.uid;
      const partnerRef = doc(db, 'partners', uid);
      const partnerSnap = await getDoc(partnerRef);
      
      if (!partnerSnap.exists()) {
        throw new Error('Parceiro não encontrado');
      }
      
      const partnerData = partnerSnap.data();
      
      if (!partnerData.settings || !partnerData.settings.delivery) {
        return {
          minTime: '20',
          maxTime: '45',
          minimumOrderAmount: '20'
        };
      }
      
      return {
        minTime: partnerData.settings.delivery.minTime,
        maxTime: partnerData.settings.delivery.maxTime,
        minimumOrderAmount: partnerData.settings.delivery.minimumOrderAmount
      };
    } catch (error) {
      console.error('Erro ao carregar configurações de tempo de entrega:', error);
      throw error;
    }
  },

  async getPaymentOptions() {
    try {
      const currentUser = auth.currentUser || getAuth().currentUser;
      
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }
      
      const uid = currentUser.uid;
      const partnerRef = doc(db, 'partners', uid);
      const partnerSnap = await getDoc(partnerRef);
      
      if (!partnerSnap.exists()) {
        throw new Error('Parceiro não encontrado');
      }
      
      const partnerData = partnerSnap.data();
      
      if (!partnerData.settings || !partnerData.settings.paymentOptions) {
        return {
          dinheiro: { type: 'Dinheiro', enabled: true },
          pix: { type: 'PIX', enabled: true },
          cartao: { 
            type: 'Cartão', 
            enabled: true,
            brands: {
              visa: true,
              mastercard: true,
              elo: false,
              amex: false,
              hipercard: false,
            }
          },
        };
      }
      
      return partnerData.settings.paymentOptions;
    } catch (error) {
      console.error('Erro ao carregar configurações de pagamento:', error);
      throw error;
    }
  },

  async getSchedule() {
    try {
      const currentUser = auth.currentUser || getAuth().currentUser;
      
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }
      
      const uid = currentUser.uid;
      const partnerRef = doc(db, 'partners', uid);
      const partnerSnap = await getDoc(partnerRef);
      
      if (!partnerSnap.exists()) {
        throw new Error('Parceiro não encontrado');
      }
      
      const partnerData = partnerSnap.data();
      
      if (!partnerData.settings || !partnerData.settings.schedule) {
        return {
          domingo: { isOpen: false, openTime: '00:00', closeTime: '00:00' },
          segunda: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
          terca: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
          quarta: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
          quinta: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
          sexta: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
          sabado: { isOpen: true, openTime: '08:00', closeTime: '18:00' }
        };
      }
      
      return partnerData.settings.schedule;
    } catch (error) {
      console.error('Erro ao carregar configurações de horário de funcionamento:', error);
      throw error;
    }
  },

  async savePickupSettings(allowPickup: boolean, estimatedTime: string): Promise<boolean> {
    try {
      const currentUser = auth.currentUser || getAuth().currentUser;
      
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }
      
      const uid = currentUser.uid;
      const partnerRef = doc(db, 'partners', uid);
      
      await setDoc(partnerRef, {
        settings: {
          pickup: {
            enabled: allowPickup,
            estimatedTime: estimatedTime
          }
        }
      }, { merge: true });
      
      console.log('Configurações de retirada salvas com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao salvar configurações de retirada:', error);
      throw error;
    }
  },

  async saveDeliveryTime(minTime: string, maxTime: string): Promise<boolean> {
    try {
      const currentUser = auth.currentUser || getAuth().currentUser;
      
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }
      
      const uid = currentUser.uid;
      const partnerRef = doc(db, 'partners', uid);
      
      let minimumOrderAmount = '20';
      try {
        const settings = await this.getDeliveryTime();
        minimumOrderAmount = settings.minimumOrderAmount || '20';
      } catch (e) {
        console.log('Erro ao obter valor mínimo atual, usando padrão:', e);
      }
      
      await setDoc(partnerRef, {
        settings: {
          delivery: {
            minTime,
            maxTime,
            minimumOrderAmount,
            enabled: true
          }
        }
      }, { merge: true });
      
      console.log('Configurações de tempo de entrega salvas com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao salvar configurações de tempo de entrega:', error);
      throw error;
    }
  },

  async saveMinimumOrderAmount(minimumOrderAmount: string): Promise<boolean> {
    try {
      const currentUser = auth.currentUser || getAuth().currentUser;
      
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }
      
      const uid = currentUser.uid;
      const partnerRef = doc(db, 'partners', uid);
      
      // Obter configurações atuais de entrega
      let minTime = '20';
      let maxTime = '45';
      try {
        const settings = await this.getDeliveryTime();
        minTime = settings.minTime || '20';
        maxTime = settings.maxTime || '45';
      } catch (e) {
        console.log('Erro ao obter configurações atuais, usando padrão:', e);
      }
      
      await setDoc(partnerRef, {
        settings: {
          delivery: {
            minTime,
            maxTime,
            minimumOrderAmount,
            enabled: true
          }
        }
      }, { merge: true });
      
      console.log('Valor mínimo do pedido salvo com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao salvar valor mínimo do pedido:', error);
      throw error;
    }
  },

  async savePaymentOptions(paymentOptions: PaymentOptions): Promise<boolean> {
    try {
      const currentUser = auth.currentUser || getAuth().currentUser;
      
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }
      
      const uid = currentUser.uid;
      const partnerRef = doc(db, 'partners', uid);
      
      await setDoc(partnerRef, {
        settings: {
          paymentOptions
        }
      }, { merge: true });
      
      console.log('Configurações de pagamento salvas com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao salvar configurações de pagamento:', error);
      throw error;
    }
  },

  async saveSchedule(schedule: Schedule): Promise<boolean> {
    try {
      const currentUser = auth.currentUser || getAuth().currentUser;
      
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }
      
      const uid = currentUser.uid;
      const partnerRef = doc(db, 'partners', uid);
      
      await setDoc(partnerRef, {
        settings: {
          schedule
        }
      }, { merge: true });
      
      console.log('Configurações de horário de funcionamento salvas com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao salvar configurações de horário de funcionamento:', error);
      throw error;
    }
  }
};
