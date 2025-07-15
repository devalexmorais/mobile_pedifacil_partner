import { db, auth } from '../config/firebase';
import { collection, query, where, doc, getDocs, getDoc, Timestamp, DocumentData, orderBy, limit, updateDoc, writeBatch, setDoc, serverTimestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { mercadoPagoService } from '../services/mercadoPagoService';

export interface AppFee {
  id: string;
  orderId: string;
  orderDate: Timestamp;      // Data do pedido - usar para ordenação/filtros principais
  completedAt: Timestamp;    // Data de processamento/conclusão
  storeId: string;
  customerId: string;
  paymentMethod: string;
  orderBaseValue: number;
  orderTotalPrice: number;
  orderDeliveryFee: number;
  orderCardFee: number;
  appFee: {               // Objeto aninhado com informações da taxa
    percentage: number;
    value: number;
    isPremiumRate: boolean;
  };
  settled: boolean;
  invoiceId: string | null;
}

export interface Invoice {
  id: string;
  partnerId: string;
  endDate: Timestamp;
  createdAt: Timestamp;
  totalAmount: number;
  originalAmount?: number;
  appliedCreditsAmount?: number;
  appliedCredits?: Array<{
    creditId: string;
    couponCode: string;
    originalValue: number;
    appliedValue: number;
  }>;
  status: 'pending' | 'paid' | 'overdue';
  paymentId?: string;
  paymentMethod?: 'pix' | 'boleto';
  paymentData?: {
    qr_code?: string;
    qr_code_base64?: string;
    ticket_url?: string;
  };
  paidAt?: Timestamp;
  details: Array<{
    id: string;
    value: number;
  }>;
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
   * Valida a estrutura de uma taxa
   */
  validateFeeStructure(fee: DocumentData, docId: string): void {
    if (!fee.orderDate || !(fee.orderDate instanceof Timestamp)) {
      throw new Error(`Taxa ${docId}: orderDate inválido ou ausente`);
    }
    if (!fee.completedAt || !(fee.completedAt instanceof Timestamp)) {
      throw new Error(`Taxa ${docId}: completedAt inválido ou ausente`);
    }
    if (!fee.appFee || typeof fee.appFee !== 'object') {
      throw new Error(`Taxa ${docId}: estrutura de appFee inválida`);
    }
    if (!('isPremiumRate' in fee.appFee)) {
      throw new Error(`Taxa ${docId}: isPremiumRate não encontrado em appFee`);
    }
  },

  /**
   * Converte dados do Firestore para AppFee
   */
  convertToAppFee(doc: DocumentData): AppFee {
    const data = doc.data();
    this.validateFeeStructure(data, doc.id);
    
    return {
      id: doc.id,
      ...data,
      orderDate: data.orderDate as Timestamp,
      completedAt: data.completedAt as Timestamp
    } as AppFee;
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
        orderBy('orderDate', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => this.convertToAppFee(doc));
    } catch (error) {
      console.error('Erro ao buscar taxas não liquidadas:', error);
      throw new Error('Não foi possível buscar as taxas não liquidadas');
    }
  },

  /**
   * Busca taxas para um período específico
   */
  async getFeesByPeriod(startDate: Date, endDate: Date, excludeInvoiced: boolean = true): Promise<AppFee[]> {
    try {
      const partnerId = await this.getCurrentPartnerId();
      
      const feesRef = collection(db, 'partners', partnerId, 'app_fees');
      
      const queryConditions = [
        where('orderDate', '>=', Timestamp.fromDate(startDate)),
        where('orderDate', '<=', Timestamp.fromDate(endDate)),
        orderBy('orderDate', 'desc')
      ];

      if (excludeInvoiced) {
        queryConditions.push(where('invoiceId', '==', null));
      }

      const q = query(feesRef, ...queryConditions);
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => this.convertToAppFee(doc));
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
        orderBy('orderDate', 'desc'),
        limit(count)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => this.convertToAppFee(doc));
    } catch (error) {
      console.error('Erro ao buscar taxas recentes:', error);
      throw new Error('Não foi possível buscar as taxas recentes');
    }
  },

  /**
   * Formata os dados da taxa para o formato correto do Firestore
   */
  formatFeeData(feeData: any): any {
    const now = Timestamp.now();

    // Garante que appFee seja um objeto aninhado
    const appFee = {
      percentage: Number(feeData.appFee?.percentage || 0),
      value: Number(feeData.appFee?.value || 0),
      isPremiumRate: Boolean(feeData.appFee?.isPremiumRate)
    };
    
    // Garante que as datas sejam Timestamp
    let completedAt = now;
    if (feeData.completedAt) {
      if (feeData.completedAt instanceof Timestamp) {
        completedAt = feeData.completedAt;
      } else if (typeof feeData.completedAt === 'string') {
        completedAt = Timestamp.fromDate(new Date(feeData.completedAt));
      }
    }

    let orderDate = now;
    if (feeData.orderDate) {
      if (feeData.orderDate instanceof Timestamp) {
        orderDate = feeData.orderDate;
      } else if (typeof feeData.orderDate === 'string') {
        orderDate = Timestamp.fromDate(new Date(feeData.orderDate));
      }
    }
    
    return {
      // Campos básicos como strings
      orderId: String(feeData.orderId || ''),
      storeId: String(feeData.storeId || ''),
      customerId: String(feeData.customerId || ''),
      paymentMethod: String(feeData.paymentMethod || ''),
      
      // Campos numéricos
      orderBaseValue: Number(feeData.orderBaseValue || 0),
      orderTotalPrice: Number(feeData.orderTotalPrice || 0),
      orderDeliveryFee: Number(feeData.orderDeliveryFee || 0),
      orderCardFee: Number(feeData.orderCardFee || 0),
      
      // Objeto appFee aninhado
      appFee,
      
      // Campos de controle
      settled: Boolean(feeData.settled || false),
      invoiceId: feeData.invoiceId || null,
      
      // Campos de data como Timestamp
      orderDate,
      completedAt
    };
  },

  /**
   * Cria uma nova taxa com validação completa
   */
  async createFee(feeData: Omit<AppFee, 'id' | 'orderDate' | 'completedAt' | 'settled' | 'invoiceId'>): Promise<string> {
    try {
      const partnerId = await this.getCurrentPartnerId();
      
      // Validação dos campos obrigatórios
      if (!feeData.orderId || !feeData.storeId || !feeData.customerId) {
        throw new Error('Campos obrigatórios ausentes');
      }

      // Validação do objeto appFee
      if (!feeData.appFee || 
          typeof feeData.appFee.percentage !== 'number' || 
          typeof feeData.appFee.value !== 'number' || 
          typeof feeData.appFee.isPremiumRate !== 'boolean') {
        throw new Error('Estrutura de appFee inválida');
      }

      // Formata os dados garantindo o tipo correto de cada campo
      const newFee = this.formatFeeData({
        ...feeData,
        completedAt: Timestamp.now(),
        orderDate: Timestamp.now()
      });

      // Validação final antes de salvar
      this.validateFeeStructure(newFee, 'nova taxa');

      const feeRef = doc(collection(db, 'partners', partnerId, 'app_fees'));
      await setDoc(feeRef, newFee);

      return feeRef.id;
    } catch (error) {
      console.error('Erro ao criar nova taxa:', error);
      throw new Error('Não foi possível criar a taxa');
    }
  },

  /**
   * Atualiza uma taxa existente
   */
  async updateFee(feeId: string, updateData: Partial<AppFee>): Promise<void> {
    try {
      const partnerId = await this.getCurrentPartnerId();
      const feeRef = doc(db, 'partners', partnerId, 'app_fees', feeId);
      
      // Busca dados atuais
      const currentDoc = await getDoc(feeRef);
      if (!currentDoc.exists()) {
        throw new Error('Taxa não encontrada');
      }

      // Mescla dados atuais com atualizações e formata
      const mergedData = this.formatFeeData({
        ...currentDoc.data(),
        ...updateData
      });

      // Valida estrutura antes de atualizar
      this.validateFeeStructure(mergedData, feeId);
      
      await updateDoc(feeRef, mergedData);
    } catch (error) {
      console.error('Erro ao atualizar taxa:', error);
      throw new Error('Não foi possível atualizar a taxa');
    }
  },

  /**
   * Cria uma nova fatura para o período especificado
   */
  async createInvoice(startDate: Date, endDate: Date): Promise<string> {
    try {
      const partnerId = await this.getCurrentPartnerId();
      const fees = await this.getFeesByPeriod(startDate, endDate);
      
      const batch = writeBatch(db);
      
      // Cria a nova fatura
      const invoiceRef = doc(collection(db, 'partners', partnerId, 'invoices'));
      const totalAmount = fees.reduce((sum, fee) => sum + fee.appFee.value, 0);
      
      const invoice: Invoice = {
        id: invoiceRef.id,
        partnerId,
        endDate: Timestamp.fromDate(endDate),
        createdAt: Timestamp.now(),
        totalAmount,
        status: 'pending',
        details: []
      };
      
      batch.set(invoiceRef, invoice);
      
      // Atualiza as taxas
      const now = Timestamp.now();
      fees.forEach(fee => {
        const feeRef = doc(db, 'partners', partnerId, 'app_fees', fee.id);
        const updateData = this.formatFeeData({
          ...fee,
          invoiceId: invoiceRef.id,
          settled: true,
          completedAt: now
        });
        
        batch.update(feeRef, updateData);
      });
      
      await batch.commit();
      return invoiceRef.id;
    } catch (error) {
      console.error('Erro ao criar fatura:', error);
      throw new Error('Não foi possível criar a fatura');
    }
  },

  /**
   * Obtém a última fatura do parceiro
   */
  async getLastInvoice(): Promise<Invoice | null> {
    try {
      const partnerId = await this.getCurrentPartnerId();
      const invoicesRef = collection(db, 'partners', partnerId, 'invoices');
      const q = query(
        invoicesRef,
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return null;
      }
      
      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      } as Invoice;
      
    } catch (error) {
      console.error('Erro ao buscar última fatura:', error);
      throw new Error('Não foi possível buscar a última fatura');
    }
  },

  /**
   * Gera uma nova fatura baseada na data da última
   */
  async generateNextInvoice(): Promise<string> {
    try {
      const lastInvoice = await this.getLastInvoice();
      
      let startDate: Date;
      if (lastInvoice) {
        startDate = lastInvoice.endDate.toDate();
      } else {
        // Se não houver fatura anterior, usa 30 dias atrás como data inicial
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
      }
      
      const endDate = new Date();
      return await this.createInvoice(startDate, endDate);
      
    } catch (error) {
      console.error('Erro ao gerar próxima fatura:', error);
      throw new Error('Não foi possível gerar a próxima fatura');
    }
  },

  /**
   * Gera um pagamento para a fatura via Mercado Pago
   */
  async generatePayment(invoice: Invoice, method: 'pix' | 'boleto', payerData?: {
    email: string;
    first_name: string;
    last_name: string;
    identification: {
      type: string;
      number: string;
    };
  }): Promise<void> {
    try {
      const description = `Fatura PediFácil - ${format(invoice.endDate.toDate(), 'MM/yyyy')}`;
      
      let paymentResponse;
      if (method === 'pix') {
        paymentResponse = await mercadoPagoService.createPixPayment(
          invoice.totalAmount,
          description,
          payerData?.email || ''
        );
      } else {
        if (!payerData) {
          throw new Error('Dados do pagador são obrigatórios para boleto');
        }
        paymentResponse = await mercadoPagoService.createBoletoPayment(
          invoice.totalAmount,
          description,
          payerData
        );
      }

      const invoiceRef = doc(db, 'partners', invoice.partnerId, 'invoices', invoice.id);
      await updateDoc(invoiceRef, {
        paymentId: paymentResponse.id,
        paymentMethod: method,
        paymentData: {
          qr_code: paymentResponse.point_of_interaction.transaction_data.qr_code,
          qr_code_base64: paymentResponse.point_of_interaction.transaction_data.qr_code_base64,
          ticket_url: paymentResponse.point_of_interaction.transaction_data.ticket_url,
        },
        status: 'pending',
        updatedAt: serverTimestamp(),
      });

    } catch (error) {
      console.error('Erro ao gerar pagamento:', error);
      throw new Error('Não foi possível gerar o pagamento');
    }
  },

  /**
   * Verifica o status do pagamento da fatura
   */
  async checkPaymentStatus(invoice: Invoice): Promise<void> {
    try {
      if (!invoice.paymentId) {
        throw new Error('Fatura sem ID de pagamento');
      }

      const status = await mercadoPagoService.getPaymentStatus(invoice.paymentId);
      
      if (status === 'approved') {
        const invoiceRef = doc(db, 'partners', invoice.partnerId, 'invoices', invoice.id);
        await updateDoc(invoiceRef, {
          status: 'paid',
          paidAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

    } catch (error) {
      console.error('Erro ao verificar status do pagamento:', error);
      throw new Error('Não foi possível verificar o status do pagamento');
    }
  },

  /**
   * Obtém uma fatura específica pelo ID
   */
  async getInvoiceById(invoiceId: string): Promise<Invoice> {
    try {
      const partnerId = await this.getCurrentPartnerId();
      const invoiceRef = doc(db, 'partners', partnerId, 'invoices', invoiceId);
      const invoiceDoc = await getDoc(invoiceRef);
      
      if (!invoiceDoc.exists()) {
        throw new Error('Fatura não encontrada');
      }
      
      return {
        id: invoiceDoc.id,
        ...invoiceDoc.data()
      } as Invoice;
      
    } catch (error) {
      console.error('Erro ao buscar fatura:', error);
      throw new Error('Não foi possível buscar a fatura');
    }
  }
}; 