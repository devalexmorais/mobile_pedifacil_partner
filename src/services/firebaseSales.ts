import { db, auth as firebaseAuth } from '@/config/firebase';
import { collection, query, where, getDocs, doc, getDoc, Timestamp, collectionGroup } from 'firebase/firestore';

// Tipos de pagamento válidos
export type PaymentMethodType = 'cash' | 'card' | 'pix';

// Interfaces
export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

// Função auxiliar para validar método de pagamento
const validatePaymentMethod = (paymentData: any): PaymentMethodType => {
  // Caso 1: Já está no formato correto
  if (paymentData === 'cash' || paymentData === 'card' || paymentData === 'pix') {
    return paymentData;
  }
  
  // Caso 2: É um objeto payment com método definido
  if (paymentData && typeof paymentData === 'object') {
    const method = paymentData.method;
    
    if (method === 'pix') return 'pix';
    if (method === 'cash') return 'cash';
    if (method === 'credit' || method === 'debit' || paymentData.flag) return 'card';
  }
  
  // Caso 3: Está em outra estrutura de dados, verificamos campo a campo
  if (paymentData?.payment) {
    return validatePaymentMethod(paymentData.payment);
  }
  
  // Valor padrão como fallback
  return 'cash';
};

export interface Order {
  id: string;
  sellerId?: string;
  customerId?: string;
  customerName: string;
  customerAddress?: string;
  items: OrderItem[];
  total: number;
  deliveryFee?: number;
  cardFeeValue?: number;
  finalPrice?: number;
  paymentMethod: PaymentMethodType;
  paymentData?: any; // Dados originais de pagamento
  status: 'pending' | 'delivered' | 'cancelled' | string;
  createdAt: Timestamp;
}

export interface DaySummary {
  date: string;
  total: number;
  orders: number;
  cash: number;
  card: number;
  pix: number;
  ordersList: Order[];
}

const firebaseSalesService = {
  /**
   * Recupera o ID e informações do vendedor atual
   */
  async getCurrentSeller() {
    const sellerId = firebaseAuth.currentUser?.uid;
    if (!sellerId) {
      throw new Error('Usuário não autenticado');
    }
    return sellerId;
  },
  
  /**
   * Busca os pedidos do dia para o vendedor atual
   */
  async getDaySales(date: Date): Promise<DaySummary> {
    try {
      const sellerId = await this.getCurrentSeller();

      // Define o início e fim do dia
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Para evitar o erro de índice, faremos a consulta apenas pelo vendedor
      // e filtraremos a data manualmente
      const ordersRef = collection(db, 'partners', sellerId, 'orders');
      const q = query(ordersRef);

      const querySnapshot = await getDocs(q);
      
      let ordersList: Order[] = [];
      let total = 0;
      let cash = 0;
      let card = 0;
      let pix = 0;
      
      // Processa os resultados e filtra pela data
      querySnapshot.forEach((doc) => {
        try {
          const data = doc.data();
          
          // Verifica se a data do pedido está dentro do intervalo desejado
          if (data.createdAt) {
            let orderDate;
            try {
              orderDate = data.createdAt.toDate();
            } catch (e) {
              console.error(`Data inválida no pedido ${doc.id}:`, e);
              return; // Pula este documento
            }
            
            if (orderDate >= startOfDay && orderDate <= endOfDay) {
              // Normalizando e garantindo os dados dos itens
              const normalizedItems = [];
              
              if (Array.isArray(data.items)) {
                data.items.forEach(item => {
                  if (item) {
                    normalizedItems.push({
                      id: item.id || `item-${Math.random().toString(36).substring(2, 9)}`,
                      name: String(item.name || 'Item sem nome'),
                      quantity: Number(item.quantity) || 1,
                      price: Number(item.price) || 0
                    });
                  }
                });
              }
              
              // Extrair o status do pedido
              const orderStatus = String(data.status || 'pending');
              
              // Garantir que todos os campos necessários existam
              const orderData: Order = {
                id: doc.id,
                customerName: String(data.customerName || data.customer?.name || 'Cliente'),
                items: normalizedItems,
                total: Number(data.total) || 0,
                paymentMethod: validatePaymentMethod(data.paymentMethod || data.payment),
                paymentData: data.payment || data.paymentMethod,
                status: orderStatus,
                createdAt: data.createdAt,
                // Opcionais
                sellerId: data.sellerId ? String(data.sellerId) : undefined,
                customerId: data.customerId ? String(data.customerId) : data.customer?.id ? String(data.customer.id) : undefined,
                customerAddress: data.customerAddress ? String(data.customerAddress) : data.customer?.address ? String(data.customer.address) : undefined,
                deliveryFee: Number(data.deliveryFee) || 0,
                cardFeeValue: Number(data.cardFeeValue) || 0,
                finalPrice: Number(data.finalPrice) || Number(data.total) || 0
              };
              
              // Se não tiver total calculado, calcular a partir dos itens
              if (!data.total && normalizedItems.length > 0) {
                orderData.total = normalizedItems.reduce((acc, item) => 
                  acc + (item.price * item.quantity), 0);
                
                // Adicionar taxa de entrega se existir
                if (orderData.deliveryFee) {
                  orderData.total += orderData.deliveryFee;
                }
              }
              
              ordersList.push(orderData);
              
              // Só adicionar aos totais se não for um pedido cancelado
              if (orderStatus !== 'cancelled') {
                total += orderData.total;
                
                // Atualização das somas por método de pagamento
                if (orderData.paymentMethod === 'cash') cash += orderData.total;
                else if (orderData.paymentMethod === 'card') card += orderData.total;
                else if (orderData.paymentMethod === 'pix') pix += orderData.total;
              }
            }
          }
        } catch (err) {
          console.error(`Erro ao processar pedido ${doc.id}:`, err);
          // Continua processando os outros pedidos
        }
      });
      
      // Ordena os pedidos por data (mais recente primeiro)
      ordersList.sort((a, b) => {
        try {
          // Verificação de segurança para evitar erro com dados inválidos
          if (!a.createdAt || !a.createdAt.seconds) return 1;  // Mover para o final
          if (!b.createdAt || !b.createdAt.seconds) return -1; // Mover para o final
          
          return b.createdAt.seconds - a.createdAt.seconds;
        } catch (err) {
          console.error('Erro ao ordenar pedidos por data:', err);
          return 0; // Manter a ordem original em caso de erro
        }
      });

      // Na função getDaySales
      // Antes de retornar, vamos garantir que todos os objetos estejam corretamente formados
      ordersList = ordersList
        .filter(order => order.status !== 'cancelled') // Remove pedidos cancelados
        .map(order => {
          // Garantir que items seja sempre um array
          if (!order.items) order.items = [];
          
          // Garantir que paymentMethod tenha um valor válido
          if (!order.paymentMethod) order.paymentMethod = 'cash';
          
          // Garantir que valores numéricos sejam números
          order.total = Number(order.total) || 0;
          if (order.deliveryFee) order.deliveryFee = Number(order.deliveryFee) || 0;
          if (order.cardFeeValue) order.cardFeeValue = Number(order.cardFeeValue) || 0;
          if (order.finalPrice) order.finalPrice = Number(order.finalPrice) || order.total || 0;
          
          // Garantir que strings sejam strings
          order.customerName = String(order.customerName || 'Cliente');
          if (order.customerAddress) order.customerAddress = String(order.customerAddress);
          if (order.status) order.status = String(order.status);
          
          return order;
        });

      // Calcular o número de pedidos válidos (não cancelados)
      const validOrders = ordersList.filter(order => order.status !== 'cancelled');

      return {
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        total,
        orders: validOrders.length,
        cash,
        card,
        pix,
        ordersList
      };
    } catch (error) {
      console.error('Erro ao buscar vendas do dia:', error);
      throw new Error('Falha ao buscar vendas do dia');
    }
  },

  /**
   * Busca os detalhes de um pedido específico
   */
  async getOrderDetails(orderId: string): Promise<Order | null> {
    try {
      const sellerId = await this.getCurrentSeller();
      
      const orderDoc = await getDoc(doc(db, 'partners', sellerId, 'orders', orderId));
      
      if (!orderDoc.exists()) {
        return null;
      }
      
      const data = orderDoc.data();
      if (!data) return null;
      
      // Normalizando itens
      const normalizedItems = [];
      
      if (Array.isArray(data.items)) {
        data.items.forEach(item => {
          if (item) {
            normalizedItems.push({
              id: item.id || `item-${Math.random().toString(36).substring(2, 9)}`,
              name: String(item.name || 'Item sem nome'),
              quantity: Number(item.quantity) || 1,
              price: Number(item.price) || 0
            });
          }
        });
      }
      
      // Construindo o objeto de pedido normalizado com valores seguros
      const orderData: Order = {
        id: orderDoc.id,
        customerName: String(data.customerName || data.customer?.name || 'Cliente'),
        items: normalizedItems,
        total: Number(data.total) || 0,
        paymentMethod: validatePaymentMethod(data.paymentMethod || data.payment),
        paymentData: data.payment || data.paymentMethod,
        status: String(data.status || 'pending'),
        createdAt: data.createdAt,
        // Opcionais
        sellerId: data.sellerId ? String(data.sellerId) : undefined,
        customerId: data.customerId ? String(data.customerId) : data.customer?.id ? String(data.customer.id) : undefined,
        customerAddress: data.customerAddress ? String(data.customerAddress) : data.customer?.address ? String(data.customer.address) : undefined,
        deliveryFee: Number(data.deliveryFee) || 0,
        cardFeeValue: Number(data.cardFeeValue) || 0,
        finalPrice: Number(data.finalPrice) || Number(data.total) || 0
      };
      
      // Se não tiver total calculado, calcular a partir dos itens
      if (!data.total && normalizedItems.length > 0) {
        orderData.total = normalizedItems.reduce((acc, item) => 
          acc + (item.price * item.quantity), 0);
        
        // Adicionar taxa de entrega se existir
        if (orderData.deliveryFee) {
          orderData.total += orderData.deliveryFee;
        }
      }
      
      // Validação final para garantir que todos os campos estejam adequados
      if (!orderData.items) orderData.items = [];
      if (!orderData.paymentMethod) orderData.paymentMethod = 'cash';
      orderData.total = Number(orderData.total) || 0;
      if (orderData.deliveryFee) orderData.deliveryFee = Number(orderData.deliveryFee) || 0;
      orderData.customerName = String(orderData.customerName || 'Cliente');
      if (orderData.customerAddress) orderData.customerAddress = String(orderData.customerAddress);
      if (orderData.status) orderData.status = String(orderData.status);

      return orderData;
    } catch (error) {
      console.error('Erro ao buscar detalhes do pedido:', error);
      throw new Error('Falha ao buscar detalhes do pedido');
    }
  }
};

export default firebaseSalesService; 