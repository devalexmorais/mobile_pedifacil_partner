import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { appFeeService } from '../services/appFeeService';

export interface FinancialData {
  monthlyRevenue: number;
  appFeeValue: number;
  appFeePercentage: number;
  netRevenue: number;
  totalOrders: number;
  averageTicket: number;
  deliveryRate: number;
  paymentMethods: {
    cash: number;
    card: number;
    pix: number;
  };
  currentMonth: {
    revenue: number;
    orders: number;
    fees: number;
  };
  lastMonth: {
    revenue: number;
    orders: number;
    fees: number;
  };
  growthPercentage: number;
  cancelledOrders: {
    total: number;
    percentage: number;
    lostRevenue: number;
  };
  orderStats: {
    completed: number;
    cancelled: number;
    pending: number;
    total: number;
  };
}

export function useFinancialData() {
  const { user } = useAuth();
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const fetchFinancialData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Definir períodos - mês atual e anterior
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        // Buscar pedidos do mês atual (todos os pedidos concluídos)
        const ordersRef = collection(db, 'partners', user.uid, 'orders');
        const currentMonthQuery = query(
          ordersRef,
          where('createdAt', '>=', Timestamp.fromDate(currentMonthStart)),
          where('createdAt', '<=', Timestamp.fromDate(currentMonthEnd)),
          orderBy('createdAt', 'desc')
        );

        const currentMonthSnapshot = await getDocs(currentMonthQuery);
        
        // Buscar pedidos do mês anterior
        const lastMonthQuery = query(
          ordersRef,
          where('createdAt', '>=', Timestamp.fromDate(lastMonthStart)),
          where('createdAt', '<=', Timestamp.fromDate(lastMonthEnd)),
          orderBy('createdAt', 'desc')
        );

        const lastMonthSnapshot = await getDocs(lastMonthQuery);

        // Processar dados do mês atual
        let currentMonthRevenue = 0;
        let currentMonthOrders = 0;
        let totalDeliveredOrders = 0;
        let totalOrders = 0;
        let cashTotal = 0;
        let cardTotal = 0;
        let pixTotal = 0;
        
        // Dados de pedidos cancelados
        let cancelledOrders = 0;
        let cancelledRevenue = 0;
        let completedOrders = 0;
        let pendingOrders = 0;

        console.log('📋 Total de documentos encontrados no mês atual:', currentMonthSnapshot.size);

        currentMonthSnapshot.forEach((doc) => {
          const data = doc.data();
          const status = data.status;
          const orderTotal = data.total || data.finalPrice || 0;
          
          totalOrders++;
          
          // Categorizar pedidos por status
          if (status === 'cancelled' || status === 'canceled') {
            cancelledOrders++;
            if (orderTotal > 0) {
              cancelledRevenue += orderTotal;
            }
          } else if (status === 'completed' || status === 'delivered' || status === 'entregue') {
            completedOrders++;
            if (orderTotal > 0) {
              currentMonthRevenue += orderTotal;
              currentMonthOrders++;
              totalDeliveredOrders++;
              
              const paymentMethod = data.payment?.method || data.paymentMethod || 'cash';
              if (paymentMethod === 'cash' || paymentMethod === 'dinheiro') cashTotal += orderTotal;
              else if (paymentMethod === 'card' || paymentMethod === 'cartao') cardTotal += orderTotal;
              else if (paymentMethod === 'pix') pixTotal += orderTotal;
              else cashTotal += orderTotal; // fallback para dinheiro
            }
          } else {
            // Outros status - contar como em andamento/pendente
            pendingOrders++;
            if (orderTotal > 0) {
              currentMonthRevenue += orderTotal;
              currentMonthOrders++;
              totalDeliveredOrders++;
              
              const paymentMethod = data.payment?.method || data.paymentMethod || 'cash';
              if (paymentMethod === 'cash' || paymentMethod === 'dinheiro') cashTotal += orderTotal;
              else if (paymentMethod === 'card' || paymentMethod === 'cartao') cardTotal += orderTotal;
              else if (paymentMethod === 'pix') pixTotal += orderTotal;
              else cashTotal += orderTotal; // fallback para dinheiro
            }
          }
        });

        // Se ainda não encontrou receita, buscar qualquer pedido com valor
        if (currentMonthRevenue === 0 && currentMonthSnapshot.size > 0) {
          console.log('⚠️ Tentando buscar QUALQUER pedido com valor...');
          currentMonthSnapshot.forEach((doc) => {
            const data = doc.data();
            const orderTotal = data.total || data.finalPrice || 0;
            
            if (orderTotal > 0) {
              currentMonthRevenue += orderTotal;
              currentMonthOrders++;
              totalDeliveredOrders++;
              cashTotal += orderTotal; // adiciona como dinheiro por padrão
            }
          });
        }

        console.log('📊 Receita do mês atual:', `R$ ${currentMonthRevenue.toFixed(2)} (${currentMonthOrders} pedidos)`);
        console.log('📊 Estatísticas de pedidos:', {
          'Total de pedidos': totalOrders,
          'Pedidos completados': completedOrders,
          'Pedidos cancelados': cancelledOrders,
          'Pedidos pendentes': pendingOrders,
          'Receita perdida (cancelados)': `R$ ${cancelledRevenue.toFixed(2)}`
        });

        // Processar dados do mês anterior
        let lastMonthRevenue = 0;
        let lastMonthOrders = 0;

        console.log('📋 Total de documentos encontrados no mês anterior:', lastMonthSnapshot.size);

        lastMonthSnapshot.forEach((doc) => {
          const data = doc.data();
          const status = data.status;
          const orderTotal = data.total || data.finalPrice || 0;
          
          // Aceitar qualquer pedido com valor maior que 0, exceto explicitamente cancelados
          if (orderTotal > 0 && status !== 'cancelled' && status !== 'canceled') {
            lastMonthRevenue += orderTotal;
            lastMonthOrders++;
          }
        });

        // Fallback para mês anterior também
        if (lastMonthRevenue === 0 && lastMonthSnapshot.size > 0) {
          console.log('⚠️ Tentando buscar QUALQUER pedido do mês anterior com valor...');
          lastMonthSnapshot.forEach((doc) => {
            const data = doc.data();
            const orderTotal = data.total || data.finalPrice || 0;
            
            if (orderTotal > 0) {
              lastMonthRevenue += orderTotal;
              lastMonthOrders++;
            }
          });
        }

        console.log('📊 Receita do mês anterior:', `R$ ${lastMonthRevenue.toFixed(2)} (${lastMonthOrders} pedidos)`);

        // Buscar taxas reais da coleção app_fees
        let totalFees = 0;
        let averageFeePercentage = 5; // Taxa padrão de 5%

        try {
          console.log('🔍 Buscando taxas reais da coleção app_fees...');
          
          // Buscar taxas do mês atual diretamente da subcoleção app_fees
          const appFeesRef = collection(db, 'partners', user.uid, 'app_fees');
          const appFeesQuery = query(
            appFeesRef,
            where('orderDate', '>=', Timestamp.fromDate(currentMonthStart)),
            where('orderDate', '<=', Timestamp.fromDate(currentMonthEnd)),
            orderBy('orderDate', 'desc')
          );

          const appFeesSnapshot = await getDocs(appFeesQuery);
          console.log(`📊 Encontradas ${appFeesSnapshot.size} taxas no mês atual`);

          if (!appFeesSnapshot.empty) {
            let totalFeeValue = 0;
            let totalPercentage = 0;
            let validFees = 0;

            appFeesSnapshot.forEach((doc) => {
              const feeData = doc.data();
              
              if (feeData.appFee) {
                totalFeeValue += feeData.appFee.value || 0;
                totalPercentage += feeData.appFee.percentage || 0;
                validFees++;
              }
            });

            totalFees = totalFeeValue;
            
            // Calcular porcentagem correta baseada na receita real
            if (currentMonthRevenue > 0 && totalFees > 0) {
              averageFeePercentage = (totalFees / currentMonthRevenue) * 100;
            } else if (validFees > 0) {
              const avgFromData = totalPercentage / validFees;
              // Se o valor parece ser decimal (ex: 0.05), converter para porcentagem
              averageFeePercentage = avgFromData < 1 ? avgFromData * 100 : avgFromData;
            } else {
              averageFeePercentage = 5;
            }

            console.log('💼 Resumo das taxas:', {
              totalFees: `R$ ${totalFees.toFixed(2)}`,
              receita: `R$ ${currentMonthRevenue.toFixed(2)}`,
              porcentagemCalculada: `${averageFeePercentage.toFixed(2)}%`,
              validFees,
              porcentagemDados: validFees > 0 ? `${(totalPercentage / validFees).toFixed(4)}` : 'N/A'
            });
          } else {
            console.log('⚠️ Nenhuma taxa encontrada na coleção app_fees, verificando fatura...');
            
            // Se não encontrou taxas individuais, buscar na fatura do mês
            const invoicesRef = collection(db, 'partners', user.uid, 'invoices');
            const invoicesQuery = query(
              invoicesRef,
              where('createdAt', '>=', Timestamp.fromDate(currentMonthStart)),
              where('createdAt', '<=', Timestamp.fromDate(currentMonthEnd)),
              orderBy('createdAt', 'desc')
            );

            const invoicesSnapshot = await getDocs(invoicesQuery);
            console.log(`📋 Encontradas ${invoicesSnapshot.size} faturas no mês atual`);

            if (!invoicesSnapshot.empty) {
              const invoiceData = invoicesSnapshot.docs[0].data();
              totalFees = invoiceData.totalAmount || 0;
              
              // Calcular porcentagem real baseada na receita
              if (currentMonthRevenue > 0 && totalFees > 0) {
                averageFeePercentage = (totalFees / currentMonthRevenue) * 100;
              }
              
              console.log('📄 Taxa obtida da fatura:', {
                valor: `R$ ${totalFees.toFixed(2)}`,
                porcentagem: `${averageFeePercentage.toFixed(2)}%`,
                receita: `R$ ${currentMonthRevenue.toFixed(2)}`
              });
            } else {
              console.log('🔧 Calculando taxa estimada baseada na receita...');
              // Calcular taxa estimada se não há dados
              totalFees = currentMonthRevenue * (averageFeePercentage / 100);
            }
          }
        } catch (error) {
          console.error('❌ Erro ao buscar taxas reais:', error);
          // Fallback para cálculo estimado
          totalFees = currentMonthRevenue * (averageFeePercentage / 100);
          console.log('⚠️ Usando cálculo estimado de taxas:', `R$ ${totalFees.toFixed(2)}`);
        }

        // Validar e ajustar porcentagem se necessário
        if (averageFeePercentage <= 0 || averageFeePercentage > 20) {
          console.log('⚠️ Porcentagem inválida detectada:', averageFeePercentage);
          if (currentMonthRevenue > 0 && totalFees > 0) {
            averageFeePercentage = (totalFees / currentMonthRevenue) * 100;
            console.log('✅ Porcentagem recalculada:', averageFeePercentage);
          } else {
            averageFeePercentage = 5; // fallback padrão
            console.log('✅ Usando porcentagem padrão: 5%');
          }
        }

        // Verificar se a porcentagem é muito pequena (pode ser decimal em vez de porcentagem)
        if (averageFeePercentage > 0 && averageFeePercentage < 1) {
          console.log('⚠️ Porcentagem muito pequena detectada:', averageFeePercentage);
          // Verificar se multiplicando por 100 fica mais próximo do esperado
          const adjustedPercentage = averageFeePercentage * 100;
          if (adjustedPercentage >= 3 && adjustedPercentage <= 15) {
            averageFeePercentage = adjustedPercentage;
            console.log('✅ Porcentagem ajustada para:', averageFeePercentage);
          } else {
            // Calcular baseado na receita real
            averageFeePercentage = currentMonthRevenue > 0 ? (totalFees / currentMonthRevenue) * 100 : 5;
            console.log('✅ Porcentagem recalculada baseada na receita:', averageFeePercentage);
          }
        }

        // Calcular crescimento
        const growthPercentage = lastMonthRevenue > 0 
          ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
          : 0;

        // Calcular taxa de entrega
        const deliveryRate = totalOrders > 0 ? (totalDeliveredOrders / totalOrders) * 100 : 0;

        // Calcular ticket médio
        const averageTicket = currentMonthOrders > 0 ? currentMonthRevenue / currentMonthOrders : 0;

        // Calcular estatísticas de cancelamento
        const cancelledPercentage = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

        const financialData: FinancialData = {
          monthlyRevenue: currentMonthRevenue,
          appFeeValue: totalFees,
          appFeePercentage: averageFeePercentage,
          netRevenue: currentMonthRevenue - totalFees,
          totalOrders: currentMonthOrders,
          averageTicket,
          deliveryRate,
          paymentMethods: {
            cash: cashTotal,
            card: cardTotal,
            pix: pixTotal
          },
          currentMonth: {
            revenue: currentMonthRevenue,
            orders: currentMonthOrders,
            fees: totalFees
          },
          lastMonth: {
            revenue: lastMonthRevenue,
            orders: lastMonthOrders,
            fees: lastMonthRevenue * (averageFeePercentage / 100)
          },
          growthPercentage,
          cancelledOrders: {
            total: cancelledOrders,
            percentage: cancelledPercentage,
            lostRevenue: cancelledRevenue
          },
          orderStats: {
            completed: completedOrders,
            cancelled: cancelledOrders,
            pending: pendingOrders,
            total: totalOrders
          }
        };

        console.log('💰 RESUMO FINANCEIRO COMPLETO:', {
          'Receita do mês atual': `R$ ${currentMonthRevenue.toFixed(2)}`,
          'Pedidos válidos atual': currentMonthOrders,
          'Total de pedidos atual': totalOrders,
          'Taxa do app': `R$ ${totalFees.toFixed(2)} (${averageFeePercentage.toFixed(2)}%)`,
          'Valor líquido': `R$ ${(currentMonthRevenue - totalFees).toFixed(2)}`,
          'Receita mês anterior': `R$ ${lastMonthRevenue.toFixed(2)}`,
          'Crescimento': `${growthPercentage.toFixed(1)}%`,
          'Taxa de entrega': `${deliveryRate.toFixed(1)}%`,
          'Percentual da taxa (calculado)': currentMonthRevenue > 0 ? `${((totalFees / currentMonthRevenue) * 100).toFixed(2)}%` : '0%',
          'Estatísticas de cancelamento': {
            'Pedidos cancelados': cancelledOrders,
            'Percentual de cancelamento': `${cancelledPercentage.toFixed(1)}%`,
            'Receita perdida': `R$ ${cancelledRevenue.toFixed(2)}`
          },
          'Métodos de pagamento': {
            'Dinheiro': `R$ ${cashTotal.toFixed(2)}`,
            'Cartão': `R$ ${cardTotal.toFixed(2)}`,
            'PIX': `R$ ${pixTotal.toFixed(2)}`
          }
        });

        setFinancialData(financialData);
      } catch (err) {
        console.error('Erro ao buscar dados financeiros:', err);
        setError('Erro ao carregar dados financeiros');
      } finally {
        setLoading(false);
      }
    };

    fetchFinancialData();
  }, [user?.uid]);

  return { financialData, loading, error };
} 