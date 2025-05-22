import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

interface AppFee {
  id: string;
  value: number;
  settled: boolean;
  createdAt: admin.firestore.Timestamp;
}

interface Invoice {
  id: string;
  partnerId: string;
  startDate: admin.firestore.Timestamp;
  endDate: admin.firestore.Timestamp;
  createdAt: admin.firestore.Timestamp;
  totalAmount: number;
  totalOrders: number;
  status: 'pending' | 'paid' | 'overdue';
  paymentId?: string;
  paymentMethod?: 'pix' | 'boleto';
  paymentData?: {
    qr_code?: string;
    qr_code_base64?: string;
    ticket_url?: string;
  };
  paidAt?: admin.firestore.Timestamp;
}

/**
 * Gera faturas para todos os parceiros que completaram 30 dias
 * Executa diariamente às 00:00
 */
export const generateMonthlyInvoices = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    try {
      const today = admin.firestore.Timestamp.now();
      const thirtyDaysAgo = admin.firestore.Timestamp.fromMillis(
        today.toMillis() - 30 * 24 * 60 * 60 * 1000
      );

      // Busca todos os parceiros
      const partnersSnapshot = await db.collection('partners').get();

      const batch = db.batch();
      const processedPartners: string[] = [];

      for (const partnerDoc of partnersSnapshot.docs) {
        const partnerId = partnerDoc.id;

        // Verifica se já existe uma fatura em aberto
        const lastInvoiceQuery = await db
          .collection('partners')
          .doc(partnerId)
          .collection('invoices')
          .orderBy('createdAt', 'desc')
          .limit(1)
          .get();

        let shouldCreateInvoice = false;
        let startDate = thirtyDaysAgo;

        if (!lastInvoiceQuery.empty) {
          const lastInvoice = lastInvoiceQuery.docs[0].data() as Invoice;
          // Se a última fatura foi há mais de 30 dias, cria uma nova
          if (today.toMillis() - lastInvoice.endDate.toMillis() >= 30 * 24 * 60 * 60 * 1000) {
            shouldCreateInvoice = true;
            startDate = lastInvoice.endDate;
          }
        } else {
          // Se não tem fatura, verifica se o parceiro tem mais de 30 dias
          const partnerData = partnerDoc.data();
          if (partnerData.createdAt && 
              today.toMillis() - partnerData.createdAt.toMillis() >= 30 * 24 * 60 * 60 * 1000) {
            shouldCreateInvoice = true;
          }
        }

        if (shouldCreateInvoice) {
          // Busca as taxas não liquidadas
          const feesQuery = await db
            .collection('partners')
            .doc(partnerId)
            .collection('app_fees')
            .where('settled', '==', false)
            .where('createdAt', '>=', startDate)
            .where('createdAt', '<=', today)
            .get();

          if (!feesQuery.empty) {
            let totalAmount = 0;
            const feeIds: string[] = [];

            feesQuery.forEach(feeDoc => {
              const fee = feeDoc.data() as AppFee;
              totalAmount += fee.value;
              feeIds.push(feeDoc.id);

              // Marca a taxa como liquidada
              const feeRef = db
                .collection('partners')
                .doc(partnerId)
                .collection('app_fees')
                .doc(feeDoc.id);
              batch.update(feeRef, { settled: true });
            });

            // Cria a nova fatura
            const invoiceRef = db
              .collection('partners')
              .doc(partnerId)
              .collection('invoices')
              .doc();

            const invoice: Invoice = {
              id: invoiceRef.id,
              partnerId,
              startDate,
              endDate: today,
              createdAt: today,
              totalAmount,
              totalOrders: feeIds.length,
              status: 'pending'
            };

            batch.set(invoiceRef, invoice);
            processedPartners.push(partnerId);
          }
        }
      }

      if (processedPartners.length > 0) {
        await batch.commit();
        console.log(`Faturas geradas para ${processedPartners.length} parceiros`);
      } else {
        console.log('Nenhuma fatura para gerar');
      }

    } catch (error) {
      console.error('Erro ao gerar faturas:', error);
      throw new Error('Falha ao gerar faturas mensais');
    }
  }); 