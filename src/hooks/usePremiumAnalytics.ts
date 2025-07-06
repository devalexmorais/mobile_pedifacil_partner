import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { usePremium } from './usePremium';

export interface MonthlyComparison {
  month: string;
  revenue: number;
  orders: number;
  averageTicket: number;
}

export interface PremiumAnalytics {
  monthlyComparison: MonthlyComparison[];
  projectedRevenue: number;
  topProducts: {
    name: string;
    quantity: number;
    revenue: number;
  }[];
  peakHours: {
    hour: string;
    orders: number;
  }[];
  customerStats: {
    newCustomers: number;
    returningCustomers: number;
    averageOrdersPerCustomer: number;
  };
  paymentMethodTrends: {
    method: string;
    percentage: number;
    growth: number;
  }[];
}

export function usePremiumAnalytics() {
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const [analytics, setAnalytics] = useState<PremiumAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid || !isPremium) {
      setLoading(false);
      return;
    }

    const fetchPremiumAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        const now = new Date();
        
        // Buscar dados dos últimos 3 meses
        const monthlyData: MonthlyComparison[] = [];
        
        for (let i = 2; i >= 0; i--) {
          const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
          
          const monthQuery = query(
            collection(db, 'partners', user.uid, 'orders'),
            where('createdAt', '>=', Timestamp.fromDate(monthStart)),
            where('createdAt', '<=', Timestamp.fromDate(monthEnd)),
            where('status', '==', 'delivered'),
            orderBy('createdAt', 'desc')
          );

          const monthSnapshot = await getDocs(monthQuery);
          
          let monthRevenue = 0;
          let monthOrders = 0;
          
          monthSnapshot.forEach((doc) => {
            const data = doc.data();
            monthRevenue += data.total || 0;
            monthOrders++;
          });

          monthlyData.push({
            month: monthStart.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
            revenue: monthRevenue,
            orders: monthOrders,
            averageTicket: monthOrders > 0 ? monthRevenue / monthOrders : 0
          });
        }

        // Buscar dados do mês atual para análises detalhadas
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const currentMonthQuery = query(
          collection(db, 'partners', user.uid, 'orders'),
          where('createdAt', '>=', Timestamp.fromDate(currentMonthStart)),
          where('createdAt', '<=', Timestamp.fromDate(currentMonthEnd)),
          where('status', '==', 'delivered'),
          orderBy('createdAt', 'desc')
        );

        const currentMonthSnapshot = await getDocs(currentMonthQuery);

        // Análise de produtos mais vendidos
        const productCount: { [key: string]: { quantity: number; revenue: number } } = {};
        
        // Análise de horários de pico
        const hourlyOrders: { [key: string]: number } = {};
        
        // Análise de clientes
        const customerOrders: { [key: string]: number } = {};
        
        // Análise de métodos de pagamento
        const paymentMethods = { cash: 0, card: 0, pix: 0 };

        currentMonthSnapshot.forEach((doc) => {
          const data = doc.data();
          
          // Produtos mais vendidos
          if (data.items && Array.isArray(data.items)) {
            data.items.forEach((item: any) => {
              const productName = item.name || 'Produto sem nome';
              const quantity = item.quantity || 1;
              const price = item.price || 0;
              
              if (!productCount[productName]) {
                productCount[productName] = { quantity: 0, revenue: 0 };
              }
              
              productCount[productName].quantity += quantity;
              productCount[productName].revenue += price * quantity;
            });
          }

          // Horários de pico
          if (data.createdAt) {
            const orderDate = data.createdAt.toDate();
            const hour = orderDate.getHours();
            const hourKey = `${hour.toString().padStart(2, '0')}:00`;
            
            hourlyOrders[hourKey] = (hourlyOrders[hourKey] || 0) + 1;
          }

          // Clientes
          const customerId = data.customerId || data.userId || 'anonymous';
          customerOrders[customerId] = (customerOrders[customerId] || 0) + 1;

          // Métodos de pagamento
          const paymentMethod = data.payment?.method || data.paymentMethod;
          if (paymentMethod === 'cash') paymentMethods.cash++;
          else if (paymentMethod === 'card') paymentMethods.card++;
          else if (paymentMethod === 'pix') paymentMethods.pix++;
        });

        // Processar produtos mais vendidos
        const topProducts = Object.entries(productCount)
          .sort(([, a], [, b]) => b.revenue - a.revenue)
          .slice(0, 5)
          .map(([name, data]) => ({
            name,
            quantity: data.quantity,
            revenue: data.revenue
          }));

        // Processar horários de pico
        const peakHours = Object.entries(hourlyOrders)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 6)
          .map(([hour, orders]) => ({
            hour,
            orders
          }));

        // Estatísticas de clientes
        const totalCustomers = Object.keys(customerOrders).length;
        const newCustomers = Object.values(customerOrders).filter(orders => orders === 1).length;
        const returningCustomers = totalCustomers - newCustomers;
        const totalOrders = Object.values(customerOrders).reduce((sum, orders) => sum + orders, 0);
        const averageOrdersPerCustomer = totalCustomers > 0 ? totalOrders / totalCustomers : 0;

        // Tendências de método de pagamento
        const totalPaymentOrders = paymentMethods.cash + paymentMethods.card + paymentMethods.pix;
        const paymentMethodTrends = [
          {
            method: 'Dinheiro',
            percentage: totalPaymentOrders > 0 ? (paymentMethods.cash / totalPaymentOrders) * 100 : 0,
            growth: 0 // Seria necessário comparar com mês anterior
          },
          {
            method: 'Cartão',
            percentage: totalPaymentOrders > 0 ? (paymentMethods.card / totalPaymentOrders) * 100 : 0,
            growth: 0
          },
          {
            method: 'PIX',
            percentage: totalPaymentOrders > 0 ? (paymentMethods.pix / totalPaymentOrders) * 100 : 0,
            growth: 0
          }
        ];

        // Projeção de receita baseada nos dados atuais
        const currentMonthRevenue = monthlyData[monthlyData.length - 1]?.revenue || 0;
        const avgMonthlyGrowth = monthlyData.length > 1 
          ? monthlyData.reduce((sum, month, index, arr) => {
              if (index === 0) return 0;
              const prevMonth = arr[index - 1];
              if (prevMonth.revenue === 0) return sum;
              return sum + ((month.revenue - prevMonth.revenue) / prevMonth.revenue);
            }, 0) / Math.max(1, monthlyData.length - 1)
          : 0;
        
        const projectedRevenue = currentMonthRevenue * (1 + avgMonthlyGrowth);

        const premiumAnalytics: PremiumAnalytics = {
          monthlyComparison: monthlyData,
          projectedRevenue,
          topProducts,
          peakHours,
          customerStats: {
            newCustomers,
            returningCustomers,
            averageOrdersPerCustomer
          },
          paymentMethodTrends
        };

        setAnalytics(premiumAnalytics);
      } catch (err) {
        console.error('Erro ao buscar análises premium:', err);
        setError('Erro ao carregar análises premium');
      } finally {
        setLoading(false);
      }
    };

    fetchPremiumAnalytics();
  }, [user?.uid, isPremium]);

  return { analytics, loading, error };
} 