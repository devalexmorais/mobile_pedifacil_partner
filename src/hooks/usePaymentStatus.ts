import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, Timestamp, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
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
      
      // Força renovação do token antes de chamar Cloud Functions
      const currentUser = auth.currentUser;
      if (currentUser) {
        console.log('🔄 Renovando token de autenticação...');
        await currentUser.getIdToken(true); // true = force refresh
        console.log('✅ Token renovado com sucesso');
      }
      
      // Primeiro tenta usar a Cloud Function segura
      const functions = getFunctions();
      const verificarBloqueio = httpsCallable(functions, 'verificarStatusBloqueio', {
        timeout: 10000 // 10 segundos de timeout
      });
      
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
      let overdueInvoice: any = null;
      let maxDaysPastDue = 0;

      // Verifica se alguma fatura não paga está vencida
      snapshot.docs.forEach(doc => {
        const invoice = doc.data();
        
        console.log(`🔍 DEBUG - Verificando fatura ${doc.id}: status=${invoice.status}, endDate=${invoice.endDate?.toDate?.()?.toLocaleDateString?.()}`);
        
        // Só considera faturas não pagas
        if (invoice.status === 'paid') {
          console.log(`  ✅ Fatura ${doc.id} já paga - ignorando`);
          return;
        }
        
        const dueDate = invoice.endDate.toDate();
        
        if (dueDate < today) {
          const daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          
          console.log(`  ⚠️ Fatura ${doc.id} vencida há ${daysPastDue} dias`);
          
          if (daysPastDue > maxDaysPastDue) {
            maxDaysPastDue = daysPastDue;
            overdueInvoice = { id: doc.id, ...invoice };
            console.log(`  🔒 Nova fatura mais vencida: ${doc.id} (${daysPastDue} dias)`);
          }
        } else {
          console.log(`  ✅ Fatura ${doc.id} ainda não venceu`);
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
          invoiceId: overdueInvoice?.id || 'unknown',
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



    // Monitoramento em tempo real das faturas
    const invoicesRef = collection(db, 'partners', user.uid, 'invoices');
    const q = query(invoicesRef, orderBy('endDate', 'asc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      
      try {
        setLoading(true);
        
        // Primeiro tenta usar a Cloud Function segura para verificação instantânea
        const functions = getFunctions();
        const verificarBloqueio = httpsCallable(functions, 'verificarStatusBloqueio');
        
        try {
          const result = await verificarBloqueio();
          const data = result.data as any;
          

          
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
          let overdueInvoice: any = null;
          let maxDaysPastDue = 0;

          // Verifica se alguma fatura não paga está vencida
          snapshot.docs.forEach(doc => {
            const invoice = doc.data();
            
            console.log(`🔍 DEBUG (instantâneo) - Verificando fatura ${doc.id}: status=${invoice.status}`);
            
            // Só considera faturas não pagas
            if (invoice.status === 'paid') {
              console.log(`  ✅ Fatura ${doc.id} já paga - ignorando (instantâneo)`);
              return;
            }
            
            const dueDate = invoice.endDate.toDate();
            
            if (dueDate < today) {
              const daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
              
              console.log(`  ⚠️ Fatura ${doc.id} vencida há ${daysPastDue} dias (instantâneo)`);
              
              if (daysPastDue > maxDaysPastDue) {
                maxDaysPastDue = daysPastDue;
                overdueInvoice = { id: doc.id, ...invoice };
                console.log(`  🔒 Nova fatura mais vencida (instantâneo): ${doc.id} (${daysPastDue} dias)`);
              }
            } else {
              console.log(`  ✅ Fatura ${doc.id} ainda não venceu (instantâneo)`);
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