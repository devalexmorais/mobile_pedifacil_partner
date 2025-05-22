import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

const db = admin.firestore();
const MERCADO_PAGO_ACCESS_TOKEN = functions.config().mercadopago.access_token;

interface MercadoPagoWebhook {
  action: string;
  api_version: string;
  data: {
    id: string;
  };
  date_created: string;
  id: number;
  live_mode: boolean;
  type: 'payment' | 'plan' | 'subscription' | 'invoice';
  user_id: string;
  data_id: string;
}

/**
 * Processa os webhooks do Mercado Pago
 */
export const mercadoPagoWebhook = functions.https.onRequest(async (request, response) => {
  try {
    const webhook = request.body as MercadoPagoWebhook;

    if (webhook.type !== 'payment') {
      response.status(200).send('Webhook ignorado - não é um pagamento');
      return;
    }

    // Busca os detalhes do pagamento na API do Mercado Pago
    const paymentResponse = await axios.get(
      `https://api.mercadopago.com/v1/payments/${webhook.data.id}`,
      {
        headers: {
          Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
        },
      }
    );

    const payment = paymentResponse.data;

    // Busca a fatura correspondente
    const invoicesQuery = await db
      .collectionGroup('invoices')
      .where('paymentId', '==', payment.id)
      .limit(1)
      .get();

    if (invoicesQuery.empty) {
      response.status(404).send('Fatura não encontrada');
      return;
    }

    const invoiceDoc = invoicesQuery.docs[0];
    const invoice = invoiceDoc.data();

    // Atualiza o status da fatura
    if (payment.status === 'approved') {
      await invoiceDoc.ref.update({
        status: 'paid',
        paidAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      });

      // Opcional: Enviar notificação para o parceiro
      // await sendPaymentNotification(invoice.partnerId, 'Pagamento recebido com sucesso!');
    }

    response.status(200).send('Webhook processado com sucesso');
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    response.status(500).send('Erro ao processar webhook');
  }
}); 