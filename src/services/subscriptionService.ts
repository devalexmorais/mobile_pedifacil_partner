import { db } from '../config/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, collection, addDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { mercadoPagoService } from './mercadoPagoService';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  frequency: number;
  frequency_type: 'months' | 'days';
  features: string[];
  isActive: boolean;
}

export interface CustomerData {
  email: string;
  first_name: string;
  last_name: string;
  phone?: {
    area_code: string;
    number: string;
  };
  identification?: {
    type: string;
    number: string;
  };
}

export interface SavedCard {
  id: string;
  first_six_digits: string;
  last_four_digits: string;
  payment_method: {
    id: string;
    name: string;
  };
  cardholder_name: string;
  is_default: boolean;
}

export interface Subscription {
  id: string;
  partnerId: string;
  planId: string;
  mercadoPagoCustomerId: string;
  mercadoPagoSubscriptionId: string;
  cardId: string;
  status: 'active' | 'cancelled' | 'paused' | 'expired' | 'failed';
  amount: number;
  currency: string;
  frequency: number;
  frequency_type: 'months' | 'days';
  next_payment_date: string;
  created_at: any;
  updated_at: any;
  cancelled_at?: any;
  failure_count?: number;
  last_payment_date?: string;
}

class SubscriptionService {
  /**
   * Cria ou obtém um customer do Mercado Pago
   */
  async getOrCreateCustomer(partnerId: string, customerData: CustomerData): Promise<string> {
    try {
      // Verifica se já existe um customer salvo para este partner
      const partnerRef = doc(db, 'partners', partnerId);
      const partnerSnap = await getDoc(partnerRef);
      
      if (partnerSnap.exists()) {
        const data = partnerSnap.data();
        if (data.mercadoPagoCustomerId) {
          // Verifica se o customer ainda existe no Mercado Pago
          try {
            const existingCustomer = await mercadoPagoService.getCustomerByEmail(customerData.email);
            if (existingCustomer && existingCustomer.id === data.mercadoPagoCustomerId) {
              return data.mercadoPagoCustomerId;
            }
          } catch (error) {
            console.log('Customer não encontrado, criando novo...');
          }
        }
      }

      // Tenta buscar customer existente por email
      let customer = await mercadoPagoService.getCustomerByEmail(customerData.email);
      
      // Se não existir, cria um novo
      if (!customer) {
        customer = await mercadoPagoService.createCustomer({
          ...customerData
        });
      }

      // Salva o customer ID no documento do partner
      await updateDoc(partnerRef, {
        mercadoPagoCustomerId: customer.id,
        updatedAt: serverTimestamp()
      });

      return customer.id;
    } catch (error) {
      console.error('Erro ao criar/obter customer:', error);
      throw new Error('Não foi possível criar o cliente para assinatura');
    }
  }

  /**
   * Salva um cartão para o customer
   */
  async saveCard(partnerId: string, cardToken: string): Promise<SavedCard> {
    try {
      console.log('Salvando cartão para partner:', partnerId);
      
      const partnerRef = doc(db, 'partners', partnerId);
      const partnerSnap = await getDoc(partnerRef);
      
      if (!partnerSnap.exists()) {
        throw new Error('Parceiro não encontrado');
      }

      const data = partnerSnap.data();
      if (!data.mercadoPagoCustomerId) {
        throw new Error('Customer não encontrado. Crie um customer primeiro.');
      }

      console.log('Salvando cartão no Mercado Pago para customer:', data.mercadoPagoCustomerId);

      let cardResponse;
      try {
        cardResponse = await mercadoPagoService.saveCard(data.mercadoPagoCustomerId, {
          token: cardToken
        });
      } catch (error) {
        console.warn('Erro ao salvar no Mercado Pago, usando dados simulados:', error);
        
        // Para desenvolvimento, criar resposta simulada
        if (cardToken.startsWith('mock_token_')) {
          const mockNumber = '4111111111111111'; // Número de teste Visa
          cardResponse = {
            id: `card_${Date.now()}`,
            first_six_digits: mockNumber.substring(0, 6),
            last_four_digits: mockNumber.slice(-4),
            payment_method: {
              id: 'visa',
              name: 'Visa'
            },
            cardholder: {
              name: 'Test User',
              identification: {
                type: 'CPF',
                number: '11111111111'
              }
            },
            date_created: new Date().toISOString(),
            date_last_updated: new Date().toISOString()
          };
          console.log('Usando cartão simulado:', cardResponse.id);
        } else {
          throw error;
        }
      }

      const savedCard: SavedCard = {
        id: cardResponse.id,
        first_six_digits: cardResponse.first_six_digits,
        last_four_digits: cardResponse.last_four_digits,
        payment_method: cardResponse.payment_method,
        cardholder_name: cardResponse.cardholder.name,
        is_default: false
      };

      // Salva informações do cartão no Firestore
      const cardsRef = collection(db, 'partners', partnerId, 'saved_cards');
      await addDoc(cardsRef, {
        ...savedCard,
        created_at: serverTimestamp()
      });

      console.log('Cartão salvo com sucesso:', savedCard.id);
      return savedCard;
    } catch (error) {
      console.error('Erro ao salvar cartão:', error);
      throw error;
    }
  }

  /**
   * Lista os cartões salvos de um partner
   */
  async getSavedCards(partnerId: string): Promise<SavedCard[]> {
    try {
      const partnerRef = doc(db, 'partners', partnerId);
      const partnerSnap = await getDoc(partnerRef);
      
      if (!partnerSnap.exists() || !partnerSnap.data().mercadoPagoCustomerId) {
        return [];
      }

      const customerId = partnerSnap.data().mercadoPagoCustomerId;
      const cards = await mercadoPagoService.getCustomerCards(customerId);

      return cards.map((card: any) => ({
        id: card.id,
        first_six_digits: card.first_six_digits,
        last_four_digits: card.last_four_digits,
        payment_method: card.payment_method,
        cardholder_name: card.cardholder.name,
        is_default: false
      }));
    } catch (error) {
      console.error('Erro ao buscar cartões salvos:', error);
      return [];
    }
  }

  /**
   * Remove um cartão salvo
   */
  async removeCard(partnerId: string, cardId: string): Promise<void> {
    try {
      const partnerRef = doc(db, 'partners', partnerId);
      const partnerSnap = await getDoc(partnerRef);
      
      if (!partnerSnap.exists() || !partnerSnap.data().mercadoPagoCustomerId) {
        throw new Error('Customer não encontrado');
      }

      const customerId = partnerSnap.data().mercadoPagoCustomerId;
      await mercadoPagoService.deleteCard(customerId, cardId);

      // Remove também do Firestore se existir
      const cardsQuery = query(
        collection(db, 'partners', partnerId, 'saved_cards'),
        where('id', '==', cardId)
      );
      const cardsSnap = await getDocs(cardsQuery);
      
      for (const cardDoc of cardsSnap.docs) {
        await updateDoc(cardDoc.ref, {
          deleted_at: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Erro ao remover cartão:', error);
      throw error;
    }
  }

  /**
   * Cria uma assinatura premium
   */
  async createSubscription(
    partnerId: string,
    planId: string,
    cardId: string
  ): Promise<Subscription> {
    try {
      // Busca o plano
      const planRef = doc(db, 'plans', planId);
      const planSnap = await getDoc(planRef);
      
      if (!planSnap.exists()) {
        throw new Error('Plano não encontrado');
      }

      const plan = planSnap.data() as SubscriptionPlan;

      // Busca o customer
      const partnerRef = doc(db, 'partners', partnerId);
      const partnerSnap = await getDoc(partnerRef);
      
      if (!partnerSnap.exists() || !partnerSnap.data().mercadoPagoCustomerId) {
        throw new Error('Customer não encontrado');
      }

      const customerId = partnerSnap.data().mercadoPagoCustomerId;

      // Cria a assinatura no Mercado Pago
      const subscriptionResponse = await mercadoPagoService.createSubscription(
        customerId,
        cardId,
        {
          reason: `Assinatura Premium PediFácil - ${plan.name}`,
          auto_recurring: {
            frequency: plan.frequency,
            frequency_type: plan.frequency_type,
            transaction_amount: plan.price,
            currency_id: plan.currency || 'BRL'
          },
          external_reference: `premium_${partnerId}_${Date.now()}`
        }
      );

      // Salva a assinatura no Firestore
      const subscription: Omit<Subscription, 'id'> = {
        partnerId,
        planId,
        mercadoPagoCustomerId: customerId,
        mercadoPagoSubscriptionId: subscriptionResponse.id,
        cardId,
        status: 'active',
        amount: plan.price,
        currency: plan.currency || 'BRL',
        frequency: plan.frequency,
        frequency_type: plan.frequency_type,
        next_payment_date: subscriptionResponse.next_payment_date,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        failure_count: 0
      };

      const subscriptionRef = await addDoc(collection(db, 'subscriptions'), subscription);

      // Atualiza o status premium do partner
      await this.updatePartnerPremiumStatus(partnerId, true, subscriptionRef.id);

      return {
        id: subscriptionRef.id,
        ...subscription
      } as Subscription;

    } catch (error) {
      console.error('Erro ao criar assinatura:', error);
      throw error;
    }
  }

  /**
   * Busca a assinatura ativa de um partner
   */
  async getActiveSubscription(partnerId: string): Promise<Subscription | null> {
    try {
      const subscriptionsQuery = query(
        collection(db, 'subscriptions'),
        where('partnerId', '==', partnerId),
        where('status', 'in', ['active', 'paused']),
        orderBy('created_at', 'desc'),
        limit(1)
      );

      const subscriptionsSnap = await getDocs(subscriptionsQuery);
      
      if (subscriptionsSnap.empty) {
        return null;
      }

      const doc = subscriptionsSnap.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as Subscription;

    } catch (error) {
      console.error('Erro ao buscar assinatura ativa:', error);
      return null;
    }
  }

  /**
   * Cancela uma assinatura
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      const subscriptionRef = doc(db, 'subscriptions', subscriptionId);
      const subscriptionSnap = await getDoc(subscriptionRef);
      
      if (!subscriptionSnap.exists()) {
        throw new Error('Assinatura não encontrada');
      }

      const subscription = subscriptionSnap.data() as Subscription;

      // Cancela no Mercado Pago
      await mercadoPagoService.cancelSubscription(subscription.mercadoPagoSubscriptionId);

      // Atualiza no Firestore
      await updateDoc(subscriptionRef, {
        status: 'cancelled',
        cancelled_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      // Atualiza o status premium do partner (mas mantém até o fim do período)
      // O status será removido quando a assinatura expirar
      const partnerRef = doc(db, 'partners', subscription.partnerId);
      const partnerSnap = await getDoc(partnerRef);
      
      if (partnerSnap.exists()) {
        const currentStore = partnerSnap.data().store || {};
        await updateDoc(partnerRef, {
          store: {
            ...currentStore,
            subscriptionCancelled: true,
            cancellationDate: serverTimestamp()
          },
          updatedAt: serverTimestamp()
        });
      }

    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      throw error;
    }
  }

  /**
   * Pausa uma assinatura
   */
  async pauseSubscription(subscriptionId: string): Promise<void> {
    try {
      const subscriptionRef = doc(db, 'subscriptions', subscriptionId);
      const subscriptionSnap = await getDoc(subscriptionRef);
      
      if (!subscriptionSnap.exists()) {
        throw new Error('Assinatura não encontrada');
      }

      const subscription = subscriptionSnap.data() as Subscription;

      // Pausa no Mercado Pago
      await mercadoPagoService.pauseSubscription(subscription.mercadoPagoSubscriptionId);

      // Atualiza no Firestore
      await updateDoc(subscriptionRef, {
        status: 'paused',
        updated_at: serverTimestamp()
      });

    } catch (error) {
      console.error('Erro ao pausar assinatura:', error);
      throw error;
    }
  }

  /**
   * Retoma uma assinatura pausada
   */
  async resumeSubscription(subscriptionId: string): Promise<void> {
    try {
      const subscriptionRef = doc(db, 'subscriptions', subscriptionId);
      const subscriptionSnap = await getDoc(subscriptionRef);
      
      if (!subscriptionSnap.exists()) {
        throw new Error('Assinatura não encontrada');
      }

      const subscription = subscriptionSnap.data() as Subscription;

      // Retoma no Mercado Pago
      await mercadoPagoService.resumeSubscription(subscription.mercadoPagoSubscriptionId);

      // Atualiza no Firestore
      await updateDoc(subscriptionRef, {
        status: 'active',
        updated_at: serverTimestamp()
      });

    } catch (error) {
      console.error('Erro ao retomar assinatura:', error);
      throw error;
    }
  }

  /**
   * Atualiza o status premium do partner
   */
  private async updatePartnerPremiumStatus(partnerId: string, isPremium: boolean, subscriptionId?: string): Promise<void> {
    const partnerRef = doc(db, 'partners', partnerId);
    const partnerSnap = await getDoc(partnerRef);
    
    if (partnerSnap.exists()) {
      const currentStore = partnerSnap.data().store || {};
      
      const storeUpdate = isPremium ? {
        ...currentStore,
        isPremium: true,
        subscriptionId: subscriptionId,
        premiumActivatedAt: serverTimestamp(),
        premiumFeatures: {
          createCoupons: true,
          unlimitedProducts: true,
          productPromotions: true,
          reducedFee: true,
          advancedReports: true
        }
      } : {
        ...currentStore,
        isPremium: false,
        subscriptionId: null,
        premiumDeactivatedAt: serverTimestamp(),
        premiumFeatures: {
          createCoupons: false,
          unlimitedProducts: false,
          productPromotions: false,
          reducedFee: false,
          advancedReports: false
        }
      };

      await updateDoc(partnerRef, {
        store: storeUpdate,
        updatedAt: serverTimestamp()
      });
    }
  }

  /**
   * Processa pagamento de assinatura (cobrança direta no cartão)
   */
  async processSubscriptionPayment(paymentData: {
    partnerId: string;
    planId: string;
    cardId: string;
    amount: number;
    description: string;
    isRenewal?: boolean;
  }): Promise<{ success: boolean; paymentId?: string; error?: string }> {
    try {
      console.log('Processando cobrança de assinatura:', paymentData);

      // Busca dados do partner
      const partnerRef = doc(db, 'partners', paymentData.partnerId);
      const partnerSnap = await getDoc(partnerRef);
      
      if (!partnerSnap.exists() || !partnerSnap.data().mercadoPagoCustomerId) {
        throw new Error('Customer não encontrado');
      }

      const customerId = partnerSnap.data().mercadoPagoCustomerId;

      // Chama a Cloud Function para processar o pagamento
      const { getFunctions, httpsCallable } = require('firebase/functions');
      const functions = getFunctions();
      const processPayment = httpsCallable(functions, 'processSubscriptionPayment');

      try {
        const result = await processPayment({
          planId: paymentData.planId,
          cardId: paymentData.cardId,
          amount: paymentData.amount,
          description: paymentData.description
        });

        const data = result.data as any;
        
        if (data.success) {
          console.log('💳 Pagamento processado com sucesso via Cloud Function:', data.paymentId);
          return {
            success: true,
            paymentId: data.paymentId
          };
        } else {
          console.log('💳 Pagamento rejeitado via Cloud Function:', data.error);
          return {
            success: false,
            error: data.error
          };
        }
      } catch (functionError: any) {
        console.error('💳 Erro na Cloud Function, tentando método local:', functionError);
        
        // Fallback: tenta o método local se a Cloud Function falhar
        try {
          const paymentResponse = await mercadoPagoService.createCardPayment(customerId, paymentData.cardId, {
            transaction_amount: paymentData.amount,
            description: paymentData.description,
            payment_method_id: 'credit_card',
            external_reference: `premium_payment_${paymentData.partnerId}_${Date.now()}`
          });

          if (paymentResponse.status === 'approved') {
            console.log('Pagamento aprovado via método local:', paymentResponse.id);
            
            // Salva registro do pagamento no Firestore
            await addDoc(collection(db, 'payments'), {
              partnerId: paymentData.partnerId,
              planId: paymentData.planId,
              mercadoPagoPaymentId: paymentResponse.id,
              amount: paymentData.amount,
              status: 'approved',
              description: paymentData.description,
              isRenewal: paymentData.isRenewal || false,
              created_at: serverTimestamp()
            });

            return {
              success: true,
              paymentId: paymentResponse.id
            };
          } else {
            return {
              success: false,
              error: `Pagamento ${paymentResponse.status}: ${paymentResponse.status_detail}`
            };
          }
        } catch (localError: any) {
          console.error('❌ Erro no método local (PRODUÇÃO):', localError);
          
          return {
            success: false,
            error: localError.message || 'Falha no processamento do pagamento'
          };
        }
      }

    } catch (error: any) {
      console.error('Erro ao processar pagamento:', error);
      return {
        success: false,
        error: error.message || 'Erro interno no processamento do pagamento'
      };
    }
  }

  /**
   * Processa webhook de pagamento recorrente
   */
  async processWebhookPayment(paymentData: any): Promise<void> {
    try {
      console.log('Processando webhook de pagamento:', paymentData);

      // Busca a assinatura pelo external_reference ou subscription_id
      let subscriptionQuery;
      
      if (paymentData.external_reference && paymentData.external_reference.startsWith('premium_')) {
        const partnerId = paymentData.external_reference.split('_')[1];
        subscriptionQuery = query(
          collection(db, 'subscriptions'),
          where('partnerId', '==', partnerId),
          where('status', '==', 'active'),
          orderBy('created_at', 'desc'),
          limit(1)
        );
      } else if (paymentData.preapproval_id) {
        subscriptionQuery = query(
          collection(db, 'subscriptions'),
          where('mercadoPagoSubscriptionId', '==', paymentData.preapproval_id),
          limit(1)
        );
      } else {
        console.log('Pagamento não relacionado a assinatura');
        return;
      }

      const subscriptionSnap = await getDocs(subscriptionQuery);
      
      if (subscriptionSnap.empty) {
        console.log('Assinatura não encontrada para o pagamento');
        return;
      }

      const subscriptionDoc = subscriptionSnap.docs[0];
      const subscription = subscriptionDoc.data() as Subscription;

      // Atualiza dados da assinatura baseado no status do pagamento
      const updateData: any = {
        updated_at: serverTimestamp()
      };

      if (paymentData.status === 'approved') {
        updateData.last_payment_date = new Date().toISOString();
        updateData.failure_count = 0;
        updateData.status = 'active';
        
        // Garante que o partner continue premium
        await this.updatePartnerPremiumStatus(subscription.partnerId, true, subscriptionDoc.id);
        
      } else if (paymentData.status === 'rejected' || paymentData.status === 'cancelled') {
        const currentFailureCount = subscription.failure_count || 0;
        updateData.failure_count = currentFailureCount + 1;
        
        // Se falhar 3 vezes consecutivas, cancela a assinatura
        if (updateData.failure_count >= 3) {
          updateData.status = 'failed';
          await this.updatePartnerPremiumStatus(subscription.partnerId, false);
        }
      }

      await updateDoc(subscriptionDoc.ref, updateData);

    } catch (error) {
      console.error('Erro ao processar webhook de pagamento:', error);
    }
  }
}

export const subscriptionService = new SubscriptionService(); 