import { db } from '@/config/firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc, 
  Timestamp,
  writeBatch,
  getDoc
} from 'firebase/firestore';

export interface Credit {
  id?: string;
  orderId: string;
  partnerId: string;
  storeId: string;
  couponCode: string;
  couponIsGlobal: boolean;
  value: number;
  status: 'pending' | 'applied' | 'expired';
  createdAt: Timestamp;
  appliedAt?: Timestamp;
  invoiceId?: string;
}

export interface CreditSummary {
  totalCredits: number;
  availableCredits: number;
  appliedCredits: number;
  pendingCredits: Credit[];
  appliedCreditsList: Credit[];
}

export const creditService = {
  /**
   * Obtém todos os créditos de um parceiro
   */
  async getPartnerCredits(partnerId: string): Promise<Credit[]> {
    try {
      const creditsRef = collection(db, 'partners', partnerId, 'credits');
      const q = query(creditsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Credit[];
    } catch (error) {
      console.error('Erro ao buscar créditos:', error);
      throw new Error('Não foi possível buscar os créditos');
    }
  },

  /**
   * Obtém créditos disponíveis (status: pending)
   */
  async getAvailableCredits(partnerId: string): Promise<Credit[]> {
    try {
      const creditsRef = collection(db, 'partners', partnerId, 'credits');
      const q = query(
        creditsRef, 
        where('status', '==', 'pending'),
        orderBy('createdAt', 'asc')
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Credit[];
    } catch (error) {
      console.error('Erro ao buscar créditos disponíveis:', error);
      throw new Error('Não foi possível buscar os créditos disponíveis');
    }
  },

  /**
   * Obtém resumo dos créditos do parceiro
   */
  async getCreditSummary(partnerId: string): Promise<CreditSummary> {
    try {
      const credits = await this.getPartnerCredits(partnerId);
      
      const pendingCredits = credits.filter(credit => credit.status === 'pending');
      const appliedCredits = credits.filter(credit => credit.status === 'applied');
      
      const totalCredits = credits.reduce((sum, credit) => sum + credit.value, 0);
      const availableCredits = pendingCredits.reduce((sum, credit) => sum + credit.value, 0);
      const appliedCreditsValue = appliedCredits.reduce((sum, credit) => sum + credit.value, 0);
      
      return {
        totalCredits,
        availableCredits,
        appliedCredits: appliedCreditsValue,
        pendingCredits,
        appliedCreditsList: appliedCredits
      };
    } catch (error) {
      console.error('Erro ao calcular resumo de créditos:', error);
      throw new Error('Não foi possível calcular o resumo de créditos');
    }
  },

  /**
   * Aplica créditos a uma fatura
   */
  async applyCreditsToInvoice(
    partnerId: string, 
    invoiceId: string, 
    invoiceAmount: number
  ): Promise<{ appliedAmount: number; remainingAmount: number; appliedCredits: Credit[] }> {
    try {
      const availableCredits = await this.getAvailableCredits(partnerId);
      
      if (availableCredits.length === 0) {
        return {
          appliedAmount: 0,
          remainingAmount: invoiceAmount,
          appliedCredits: []
        };
      }

      const batch = writeBatch(db);
      let remainingAmount = invoiceAmount;
      const appliedCredits: Credit[] = [];

      // Aplica créditos em ordem cronológica (mais antigos primeiro)
      for (const credit of availableCredits) {
        if (remainingAmount <= 0) break;

        const creditToApply = Math.min(credit.value, remainingAmount);
        const creditRef = doc(db, 'partners', partnerId, 'credits', credit.id!);
        
        // Se o crédito será totalmente usado
        if (creditToApply === credit.value) {
          batch.update(creditRef, {
            status: 'applied',
            appliedAt: Timestamp.now(),
            invoiceId
          });
        } else {
          // Se o crédito será parcialmente usado, cria um novo crédito com o valor restante
          const remainingCreditValue = credit.value - creditToApply;
          
          // Atualiza o crédito atual como aplicado
          batch.update(creditRef, {
            value: creditToApply,
            status: 'applied',
            appliedAt: Timestamp.now(),
            invoiceId
          });

          // Cria um novo crédito com o valor restante
          const newCreditRef = doc(collection(db, 'partners', partnerId, 'credits'));
          batch.set(newCreditRef, {
            orderId: credit.orderId,
            partnerId: credit.partnerId,
            storeId: credit.storeId,
            couponCode: credit.couponCode,
            couponIsGlobal: credit.couponIsGlobal,
            value: remainingCreditValue,
            status: 'pending',
            createdAt: credit.createdAt
          });
        }

        appliedCredits.push({
          ...credit,
          value: creditToApply,
          status: 'applied',
          appliedAt: Timestamp.now(),
          invoiceId
        });

        remainingAmount -= creditToApply;
      }

      await batch.commit();

      const appliedAmount = invoiceAmount - remainingAmount;

      console.log(`💰 Créditos aplicados: R$ ${appliedAmount.toFixed(2)}`);
      console.log(`💳 Valor restante da fatura: R$ ${remainingAmount.toFixed(2)}`);

      return {
        appliedAmount,
        remainingAmount,
        appliedCredits
      };
    } catch (error) {
      console.error('Erro ao aplicar créditos:', error);
      throw new Error('Não foi possível aplicar os créditos');
    }
  },

  /**
   * Cria um novo crédito
   */
  async createCredit(creditData: Omit<Credit, 'id' | 'createdAt'>): Promise<string> {
    try {
      const creditsRef = collection(db, 'partners', creditData.partnerId, 'credits');
      const newCredit = {
        ...creditData,
        createdAt: Timestamp.now()
      };
      
      const docRef = await addDoc(creditsRef, newCredit);
      console.log(`✅ Crédito criado com ID: ${docRef.id}`);
      
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar crédito:', error);
      throw new Error('Não foi possível criar o crédito');
    }
  },

  /**
   * Atualiza o status de um crédito
   */
  async updateCreditStatus(
    partnerId: string, 
    creditId: string, 
    status: Credit['status'],
    invoiceId?: string
  ): Promise<void> {
    try {
      const creditRef = doc(db, 'partners', partnerId, 'credits', creditId);
      const updateData: any = {
        status,
        ...(status === 'applied' && { appliedAt: Timestamp.now() }),
        ...(invoiceId && { invoiceId })
      };
      
      await updateDoc(creditRef, updateData);
      console.log(`✅ Status do crédito ${creditId} atualizado para: ${status}`);
    } catch (error) {
      console.error('Erro ao atualizar status do crédito:', error);
      throw new Error('Não foi possível atualizar o status do crédito');
    }
  }
}; 