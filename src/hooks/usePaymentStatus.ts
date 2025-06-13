import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, Timestamp, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { getFunctions, httpsCallable } from 'firebase/functions';

export interface PaymentStatus {
  hasOverdueInvoice: boolean;
  overdueInvoice: any | null;
  daysPastDue: number;
  isBlocked: boolean; // true se passou de 7 dias
  blockingMessage: string;
}

export function usePaymentStatus() {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    hasOverdueInvoice: false,
    overdueInvoice: null,
    daysPastDue: 0,
    isBlocked: false,
    blockingMessage: ''
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const checkPaymentStatus = async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 Verificando status de pagamento para usuário:', user.uid);
      
      // Primeiro tenta usar a Cloud Function segura
      const functions = getFunctions();
      const verificarBloqueio = httpsCallable(functions, 'verificarStatusBloqueio');
      
      try {
        const result = await verificarBloqueio();
        const data = result.data as any;
        
        console.log('🔒 Status de bloqueio via Cloud Function:', data);
        
        const blockingMessage = data.isBlocked 
          ? `Estabelecimento bloqueado! Fatura vencida há ${data.daysPastDue} dias. Efetue o pagamento para continuar operando.`
          : data.daysPastDue > 0
            ? data.daysPastDue === 1 
              ? 'Você tem 1 fatura vencida há 1 dia. Efetue o pagamento o quanto antes.'
              : `Você tem 1 fatura vencida há ${data.daysPastDue} dias. Efetue o pagamento o quanto antes.`
            : '';

        setPaymentStatus({
          hasOverdueInvoice: data.daysPastDue > 0,
          overdueInvoice: data.overdueInvoice,
          daysPastDue: data.daysPastDue,
          isBlocked: data.isBlocked,
          blockingMessage
        });
        
        return;
        
      } catch (cloudError) {
        console.warn('🔒 ⚠️ Erro na Cloud Function, usando verificação local:', cloudError);
        // Continua com verificação local como fallback
      }
      
      // Fallback: Verificação local (código original)
      console.log('🔍 Usando verificação local de status de pagamento...');
      
      // Busca todas as faturas não pagas do usuário
      const invoicesRef = collection(db, 'partners', user.uid, 'invoices');
      const q = query(
        invoicesRef,
        orderBy('endDate', 'asc')
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        // Nenhuma fatura encontrada
        setPaymentStatus({
          hasOverdueInvoice: false,
          overdueInvoice: null,
          daysPastDue: 0,
            isBlocked: false,
          blockingMessage: ''
        });
        return;
      }

      const today = new Date();
      let overdueInvoice = null;
      let maxDaysPastDue = 0;

      // Verifica se alguma fatura não paga está vencida
      snapshot.docs.forEach(doc => {
        const invoice = doc.data();
        
        // Só considera faturas não pagas
        if (invoice.status === 'paid') return;
        
        const dueDate = invoice.endDate.toDate();
        
        if (dueDate < today) {
          const daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysPastDue > maxDaysPastDue) {
            maxDaysPastDue = daysPastDue;
            overdueInvoice = { id: doc.id, ...invoice };
          }
        }
      });

      if (overdueInvoice) {
        const isBlocked = maxDaysPastDue > 7;
        const blockingMessage = isBlocked 
          ? `Estabelecimento bloqueado! Fatura vencida há ${maxDaysPastDue} dias. Efetue o pagamento para continuar operando.`
          : maxDaysPastDue === 1 
            ? 'Você tem 1 fatura vencida há 1 dia. Efetue o pagamento o quanto antes.'
            : `Você tem 1 fatura vencida há ${maxDaysPastDue} dias. Efetue o pagamento o quanto antes.`;

        console.log('⚠️ Fatura vencida encontrada (local):', {
          invoiceId: overdueInvoice.id,
          daysPastDue: maxDaysPastDue,
          isBlocked,
          blockingMessage
        });

        setPaymentStatus({
          hasOverdueInvoice: true,
          overdueInvoice,
          daysPastDue: maxDaysPastDue,
          isBlocked,
          blockingMessage
        });
      } else {
        console.log('✅ Nenhuma fatura vencida encontrada (local)');
        // Nenhuma fatura vencida
        setPaymentStatus({
          hasOverdueInvoice: false,
          overdueInvoice: null,
          daysPastDue: 0,
          isBlocked: false,
          blockingMessage: ''
        });
      }

    } catch (error) {
      console.error('Erro ao verificar status de pagamento:', error);
      // Em caso de erro, não bloqueia
      setPaymentStatus({
        hasOverdueInvoice: false,
        overdueInvoice: null,
        daysPastDue: 0,
        isBlocked: false,
        blockingMessage: ''
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    console.log('🔄 Iniciando monitoramento em tempo real de faturas para:', user.uid);

    // Monitoramento em tempo real das faturas
    const invoicesRef = collection(db, 'partners', user.uid, 'invoices');
    const q = query(invoicesRef, orderBy('endDate', 'asc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      console.log('🔄 MUDANÇA DETECTADA nas faturas - verificando status instantaneamente');
      
      try {
        setLoading(true);
        
        // Primeiro tenta usar a Cloud Function segura para verificação instantânea
        const functions = getFunctions();
        const verificarBloqueio = httpsCallable(functions, 'verificarStatusBloqueio');
        
        try {
          const result = await verificarBloqueio();
          const data = result.data as any;
          
          console.log('🔒 Status de bloqueio INSTANTÂNEO via Cloud Function:', data);
          
          const blockingMessage = data.isBlocked 
            ? `Estabelecimento bloqueado! Fatura vencida há ${data.daysPastDue} dias. Efetue o pagamento para continuar operando.`
            : data.daysPastDue > 0
              ? data.daysPastDue === 1 
                ? 'Você tem 1 fatura vencida há 1 dia. Efetue o pagamento o quanto antes.'
                : `Você tem 1 fatura vencida há ${data.daysPastDue} dias. Efetue o pagamento o quanto antes.`
              : '';

          const newStatus = {
            hasOverdueInvoice: data.daysPastDue > 0,
            overdueInvoice: data.overdueInvoice,
            daysPastDue: data.daysPastDue,
            isBlocked: data.isBlocked,
            blockingMessage
          };

          // Verifica se houve mudança no status de bloqueio
          if (paymentStatus.isBlocked && !newStatus.isBlocked) {
            console.log('🎉 DESBLOQUEIO INSTANTÂNEO DETECTADO! Fatura foi paga!');
          } else if (!paymentStatus.isBlocked && newStatus.isBlocked) {
            console.log('🔒 BLOQUEIO INSTANTÂNEO DETECTADO! Fatura venceu há mais de 7 dias!');
          }

          setPaymentStatus(newStatus);
          
        } catch (cloudError) {
          console.warn('🔒 ⚠️ Erro na Cloud Function, usando verificação local instantânea:', cloudError);
          
          // Fallback: Verificação local instantânea
          if (snapshot.empty) {
            console.log('✅ DESBLOQUEIO INSTANTÂNEO - Nenhuma fatura encontrada');
            setPaymentStatus({
              hasOverdueInvoice: false,
              overdueInvoice: null,
              daysPastDue: 0,
              isBlocked: false,
              blockingMessage: ''
            });
            return;
          }

          const today = new Date();
          let overdueInvoice = null;
          let maxDaysPastDue = 0;

          // Verifica se alguma fatura não paga está vencida
          snapshot.docs.forEach(doc => {
            const invoice = doc.data();
            
            // Só considera faturas não pagas
            if (invoice.status === 'paid') return;
            
            const dueDate = invoice.endDate.toDate();
            
            if (dueDate < today) {
              const daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
              
              if (daysPastDue > maxDaysPastDue) {
                maxDaysPastDue = daysPastDue;
                overdueInvoice = { id: doc.id, ...invoice };
              }
            }
          });

          const isBlocked = maxDaysPastDue > 7;
          const blockingMessage = isBlocked 
            ? `Estabelecimento bloqueado! Fatura vencida há ${maxDaysPastDue} dias. Efetue o pagamento para continuar operando.`
            : maxDaysPastDue > 0
              ? maxDaysPastDue === 1 
                ? 'Você tem 1 fatura vencida há 1 dia. Efetue o pagamento o quanto antes.'
                : `Você tem 1 fatura vencida há ${maxDaysPastDue} dias. Efetue o pagamento o quanto antes.`
              : '';

          const newStatus = {
            hasOverdueInvoice: maxDaysPastDue > 0,
            overdueInvoice,
            daysPastDue: maxDaysPastDue,
            isBlocked,
            blockingMessage
          };

          // Verifica se houve mudança no status de bloqueio
          if (paymentStatus.isBlocked && !newStatus.isBlocked) {
            console.log('🎉 DESBLOQUEIO INSTANTÂNEO DETECTADO (local)! Fatura foi paga!');
          } else if (!paymentStatus.isBlocked && newStatus.isBlocked) {
            console.log('🔒 BLOQUEIO INSTANTÂNEO DETECTADO (local)! Fatura venceu há mais de 7 dias!');
          }

          setPaymentStatus(newStatus);
        }
        
      } catch (error) {
        console.error('❌ Erro na verificação instantânea:', error);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error('❌ Erro no listener de faturas:', error);
      setLoading(false);
    });

    // Cleanup
    return () => {
      console.log('🔄 Parando monitoramento em tempo real de faturas');
      unsubscribe();
    };
  }, [user?.uid]);

  return {
    paymentStatus,
    loading,
    checkPaymentStatus
  };
} 