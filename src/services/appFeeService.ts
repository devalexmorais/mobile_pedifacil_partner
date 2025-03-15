import { db, auth } from '../config/firebase';
import { collection, query, where, doc, getDocs, getDoc, Timestamp, DocumentData, orderBy, limit } from 'firebase/firestore';

export interface AppFee {
  id: string;
  orderId: string;
  orderDate: Timestamp;
  completedAt: string;
  storeId: string;
  customerId: string;
  paymentMethod: string;
  orderBaseValue: number;
  orderTotalPrice: number;
  orderDeliveryFee: number;
  orderCardFee: number;
  appFee: {
    percentage: number;
    value: number;
    isPremiumRate: boolean;
  };
  settled: boolean;
  invoiceId: string | null;
}

export interface FeeSummary {
  totalOrders: number;
  totalBaseValue: number;
  totalOrdersValue: number;
  totalFees: number;
  averageFeePercentage: number;
  startDate: Date;
  endDate: Date;
  fees: AppFee[];
}

export const appFeeService = {
  /**
   * Obtém o ID do parceiro atual
   */
  async getCurrentPartnerId(): Promise<string> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Usuário não autenticado');
    }
    return user.uid;
  },

  /**
   * Busca todas as taxas não liquidadas para o parceiro atual
   */
  async getUnsettledFees(): Promise<AppFee[]> {
    try {
      const partnerId = await this.getCurrentPartnerId();
      
      const feesRef = collection(db, 'partners', partnerId, 'app_fees');
      const q = query(
        feesRef,
        where('settled', '==', false),
        orderBy('completedAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AppFee[];
    } catch (error) {
      console.error('Erro ao buscar taxas não liquidadas:', error);
      throw new Error('Não foi possível buscar as taxas não liquidadas');
    }
  },

  /**
   * Busca taxas para um período específico
   */
  async getFeesByPeriod(startDate: Date, endDate: Date): Promise<AppFee[]> {
    try {
      const partnerId = await this.getCurrentPartnerId();
      
      const feesRef = collection(db, 'partners', partnerId, 'app_fees');
      const q = query(
        feesRef,
        where('completedAt', '>=', startDate.toISOString()),
        where('completedAt', '<=', endDate.toISOString()),
        orderBy('completedAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AppFee[];
    } catch (error) {
      console.error('Erro ao buscar taxas por período:', error);
      throw new Error('Não foi possível buscar as taxas para o período especificado');
    }
  },

  /**
   * Gera um resumo das taxas para o período especificado
   */
  async getFeesSummary(startDate: Date, endDate: Date): Promise<FeeSummary> {
    try {
      const fees = await this.getFeesByPeriod(startDate, endDate);
      
      if (fees.length === 0) {
        return {
          totalOrders: 0,
          totalBaseValue: 0,
          totalOrdersValue: 0,
          totalFees: 0,
          averageFeePercentage: 0,
          startDate,
          endDate,
          fees: []
        };
      }
      
      const totalOrders = fees.length;
      const totalBaseValue = fees.reduce((sum, fee) => sum + fee.orderBaseValue, 0);
      const totalOrdersValue = fees.reduce((sum, fee) => sum + fee.orderTotalPrice, 0);
      const totalFees = fees.reduce((sum, fee) => sum + fee.appFee.value, 0);
      
      // Calcula a média ponderada da porcentagem de taxa
      const weightedPercentageSum = fees.reduce(
        (sum, fee) => sum + (fee.appFee.percentage * fee.orderBaseValue), 
        0
      );
      const averageFeePercentage = totalBaseValue > 0 
        ? weightedPercentageSum / totalBaseValue 
        : 0;
      
      return {
        totalOrders,
        totalBaseValue,
        totalOrdersValue,
        totalFees,
        averageFeePercentage,
        startDate,
        endDate,
        fees
      };
    } catch (error) {
      console.error('Erro ao gerar resumo de taxas:', error);
      throw new Error('Não foi possível gerar o resumo de taxas');
    }
  },
  
  /**
   * Busca as taxas mais recentes
   */
  async getRecentFees(count: number = 10): Promise<AppFee[]> {
    try {
      const partnerId = await this.getCurrentPartnerId();
      
      const feesRef = collection(db, 'partners', partnerId, 'app_fees');
      const q = query(
        feesRef,
        orderBy('completedAt', 'desc'),
        limit(count)
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AppFee[];
    } catch (error) {
      console.error('Erro ao buscar taxas recentes:', error);
      throw new Error('Não foi possível buscar as taxas recentes');
    }
  }
}; 