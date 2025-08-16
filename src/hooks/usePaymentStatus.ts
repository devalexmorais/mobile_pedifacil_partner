import { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { getFunctions, httpsCallable } from 'firebase/functions';

export interface PaymentStatus {
  hasOverdueInvoice: boolean;
  overdueInvoice: any | null;
  daysPastDue: number;
  isBlocked: boolean; // true se passou de 7 dias
  isAdminBlocked: boolean; // true se bloqueado pelo admin
  blockingMessage: string;
}

export function usePaymentStatus() {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    hasOverdueInvoice: false,
    overdueInvoice: null,
    daysPastDue: 0,
    isBlocked: false,
    isAdminBlocked: false,
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
      
      // Força renovação do token antes de chamar Cloud Functions
      const currentUser = auth.currentUser;
      if (currentUser) {
        await currentUser.getIdToken(true);
      }
      
      // Primeiro tenta usar a Cloud Function segura
      const functions = getFunctions();
      const verificarBloqueio = httpsCallable(functions, 'verificarStatusBloqueio', {
        timeout: 10000
      });
      
      try {
        const result = await verificarBloqueio();
        const data = result.data as any;
        
        const blockingMessage = data.isBlocked 
          ? data.isAdminBlocked
            ? 'Estabelecimento bloqueado pelo administrador por infringir as regras do app. Entre em contato com o suporte.'
            : `Estabelecimento bloqueado! Fatura vencida há ${data.daysPastDue} dias. Efetue o pagamento para continuar operando.`
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
          isAdminBlocked: data.isAdminBlocked,
          blockingMessage
        });
        
        return;
        
      } catch (cloudError) {
        // Continua com verificação local como fallback
      }
      
      // Fallback: Verificação local
      const partnerRef = doc(db, 'partners', user.uid);
      const partnerDoc = await getDoc(partnerRef);
      
      if (partnerDoc.exists()) {
        const partnerData = partnerDoc.data();
        
        // Verifica se está bloqueado pelo admin
        if (partnerData.isActive === false) {
          setPaymentStatus({
            hasOverdueInvoice: false,
            overdueInvoice: null,
            daysPastDue: 0,
            isBlocked: true,
            isAdminBlocked: true,
            blockingMessage: 'Estabelecimento bloqueado pelo administrador por infringir as regras do app. Entre em contato com o suporte.'
          });
          return;
        }
      }
      
      // Busca todas as faturas não pagas do usuário
      const invoicesRef = collection(db, 'partners', user.uid, 'invoices');
      const q = query(invoicesRef, orderBy('endDate', 'asc'));
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setPaymentStatus({
          hasOverdueInvoice: false,
          overdueInvoice: null,
          daysPastDue: 0,
          isBlocked: false,
          isAdminBlocked: false,
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
        
        if (invoice.status === 'paid') {
          return;
        }
        
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

        setPaymentStatus({
          hasOverdueInvoice: true,
          overdueInvoice,
          daysPastDue: maxDaysPastDue,
          isBlocked,
          isAdminBlocked: false,
          blockingMessage
        });
      } else {
        setPaymentStatus({
          hasOverdueInvoice: false,
          overdueInvoice: null,
          daysPastDue: 0,
          isBlocked: false,
          isAdminBlocked: false,
          blockingMessage: ''
        });
      }

    } catch (error) {
      setPaymentStatus({
        hasOverdueInvoice: false,
        overdueInvoice: null,
        daysPastDue: 0,
        isBlocked: false,
        isAdminBlocked: false,
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

    // Listener para mudanças no documento do parceiro (para detectar bloqueios admin)
    const partnerRef = doc(db, 'partners', user.uid);
    const unsubscribePartner = onSnapshot(partnerRef, (doc) => {
      if (doc.exists()) {
        const partnerData = doc.data();
        
        // Se o campo isActive mudou para false, atualiza o status imediatamente
        if (partnerData.isActive === false) {
          setPaymentStatus({
            hasOverdueInvoice: false,
            overdueInvoice: null,
            daysPastDue: 0,
            isBlocked: true,
            isAdminBlocked: true,
            blockingMessage: 'Estabelecimento bloqueado pelo administrador por infringir as regras do app. Entre em contato com o suporte.'
          });
          return;
        }
        
        // Se o campo isActive mudou para true, verifica se há faturas vencidas
        if (partnerData.isActive === true) {
          // Reseta o status de bloqueio admin e verifica faturas
          checkPaymentStatus();
        }
      }
    });

    // Monitoramento em tempo real das faturas
    const invoicesRef = collection(db, 'partners', user.uid, 'invoices');
    const q = query(invoicesRef, orderBy('endDate', 'asc'));

    const unsubscribeInvoices = onSnapshot(q, async (snapshot) => {
      try {
        setLoading(true);
        
        // Primeiro tenta usar a Cloud Function segura para verificação instantânea
        const functions = getFunctions();
        const verificarBloqueio = httpsCallable(functions, 'verificarStatusBloqueio');
        
        try {
          const result = await verificarBloqueio();
          const data = result.data as any;
          
          const blockingMessage = data.isBlocked 
            ? data.isAdminBlocked
              ? 'Estabelecimento bloqueado pelo administrador por infringir as regras do app. Entre em contato com o suporte.'
              : `Estabelecimento bloqueado! Fatura vencida há ${data.daysPastDue} dias. Efetue o pagamento para continuar operando.`
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
            isAdminBlocked: data.isAdminBlocked,
            blockingMessage
          };

          setPaymentStatus(newStatus);
          
        } catch (cloudError) {
          // Fallback: Verificação local instantânea
          if (snapshot.empty) {
            setPaymentStatus({
              hasOverdueInvoice: false,
              overdueInvoice: null,
              daysPastDue: 0,
              isBlocked: false,
              isAdminBlocked: false,
              blockingMessage: ''
            });
            return;
          }

          // Primeiro verifica se o parceiro está bloqueado pelo admin
          const partnerRef = doc(db, 'partners', user.uid);
          const partnerDoc = await getDoc(partnerRef);
          
          if (partnerDoc.exists()) {
            const partnerData = partnerDoc.data();
            
            if (partnerData.isActive === false) {
              setPaymentStatus({
                hasOverdueInvoice: false,
                overdueInvoice: null,
                daysPastDue: 0,
                isBlocked: true,
                isAdminBlocked: true,
                blockingMessage: 'Estabelecimento bloqueado pelo administrador por infringir as regras do app. Entre em contato com o suporte.'
              });
              return;
            }
          }

          const today = new Date();
          let overdueInvoice: any = null;
          let maxDaysPastDue = 0;

          snapshot.docs.forEach(doc => {
            const invoice = doc.data();
            
            if (invoice.status === 'paid') {
              return;
            }
            
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
            isAdminBlocked: false,
            blockingMessage
          };

          setPaymentStatus(newStatus);
        }
        
      } catch (error) {
        // Em caso de erro, não bloqueia
        setPaymentStatus({
          hasOverdueInvoice: false,
          overdueInvoice: null,
          daysPastDue: 0,
          isBlocked: false,
          isAdminBlocked: false,
          blockingMessage: ''
        });
      } finally {
        setLoading(false);
      }
    }, (error) => {
      // Em caso de erro, não bloqueia
      setPaymentStatus({
        hasOverdueInvoice: false,
        overdueInvoice: null,
        daysPastDue: 0,
        isBlocked: false,
        isAdminBlocked: false,
        blockingMessage: ''
      });
    });

    return () => {
      unsubscribePartner();
      unsubscribeInvoices();
    };
  }, [user?.uid]);

  return {
    paymentStatus,
    loading,
    checkPaymentStatus
  };
} 