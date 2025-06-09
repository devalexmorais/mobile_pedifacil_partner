const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const axios = require('axios');

let serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Configuração do Mercado Pago
const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || functions.config().mercadopago?.access_token;

if (!accessToken) {
  throw new Error('Token de acesso do Mercado Pago não configurado');
}

if (!accessToken.startsWith('TEST-') && !accessToken.startsWith('APP_USR-')) {
  throw new Error('Token de acesso do Mercado Pago inválido');
}

const client = new MercadoPagoConfig({ accessToken });
const payment = new Payment(client);

// Lista de IPs do Mercado Pago
const MERCADO_PAGO_IPS = [
  '34.195.33.156',
  '34.195.252.238',
  '34.200.230.236'
];

// Função para gerar pagamento de uma fatura
exports.gerarPagamento = functions.https.onCall(async (data, context) => {
  try {
    console.log('Dados recebidos:', JSON.stringify(data, null, 2));

    // Validação básica dos dados
    if (!data || typeof data !== 'object') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Dados inválidos. Envie um objeto com partnerId, invoiceId e tipoPagamento'
      );
    }

    const { partnerId, invoiceId, tipoPagamento } = data;

    // Validação detalhada de cada campo
    if (!partnerId || typeof partnerId !== 'string') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'partnerId é obrigatório e deve ser uma string'
      );
    }

    if (!invoiceId || typeof invoiceId !== 'string') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'invoiceId é obrigatório e deve ser uma string'
      );
    }

    if (!tipoPagamento || !['pix', 'boleto'].includes(tipoPagamento)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'tipoPagamento é obrigatório e deve ser "pix" ou "boleto"'
      );
    }

    console.log('Dados validados com sucesso:', { partnerId, invoiceId, tipoPagamento });
    console.log('Token de acesso atual:', accessToken ? `${accessToken.substring(0, 10)}...` : 'Token não encontrado');

    // 1. Pega o invoice do Firestore
    const invoiceRef = db.collection('partners').doc(partnerId).collection('invoices').doc(invoiceId);
    const invoiceSnap = await invoiceRef.get();
    
    if (!invoiceSnap.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Invoice não encontrado!'
      );
    }
    
    const invoice = invoiceSnap.data();
    console.log('Invoice encontrado:', invoice);

    // 2. Monta os dados do pagamento
    const payment_data = {
      transaction_amount: invoice.totalAmount || 1.00,
      description: `Fatura PediFácil - ${invoice.id}`,
      payment_method_id: tipoPagamento === 'pix' ? 'pix' : 'bolbradesco',
      payer: {
        email: invoice.partnerInfo?.email || 'test@test.com',
        first_name: invoice.partnerInfo?.name?.split(' ')[0] || 'Test',
        last_name: invoice.partnerInfo?.name?.split(' ').slice(1).join(' ') || 'User',
        identification: {
          type: 'CPF',
          number: invoice.partnerInfo?.cpf?.replace(/\D/g, '') || '19119119100'
        },
        address: tipoPagamento === 'boleto' ? {
          zip_code: invoice.partnerInfo?.address?.cep?.replace(/\D/g, '') || '',
          street_name: invoice.partnerInfo?.address?.street || '',
          street_number: invoice.partnerInfo?.address?.number || '',
          neighborhood: invoice.partnerInfo?.address?.neighborhood || '',
          city: invoice.partnerInfo?.address?.city || '',
          federal_unit: invoice.partnerInfo?.address?.state || ''
        } : undefined
      }
    };

    // Validação dos campos de endereço para boleto
    if (tipoPagamento === 'boleto') {
      const requiredFields = ['zip_code', 'street_name', 'street_number', 'neighborhood', 'city', 'federal_unit'];
      const missingFields = requiredFields.filter(field => !payment_data.payer.address[field]);
      
      if (missingFields.length > 0) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Para gerar um boleto, os seguintes campos de endereço são obrigatórios: ${missingFields.join(', ')}`
        );
      }
    }

    console.log('Dados do pagamento a serem enviados:', JSON.stringify(payment_data, null, 2));

    // 3. Cria o pagamento no Mercado Pago
    const paymentResult = await payment.create({ body: payment_data });
    console.log('Resposta completa do Mercado Pago:', JSON.stringify(paymentResult, null, 2));

    // 4. Prepara os dados para salvar
    const updateData = {
      'paymentInfo.paymentId': paymentResult.id,
      'paymentInfo.paymentMethod': tipoPagamento,
      'paymentInfo.status': paymentResult.status,
      'paymentInfo.partnerId': partnerId,
      'paymentInfo.history': [{
        status: paymentResult.status,
        date: new Date(),
        detail: 'Pagamento criado'
      }]
    };

    if (tipoPagamento === 'pix') {
      const qrCode = paymentResult.point_of_interaction?.transaction_data?.qr_code;
      const qrCodeBase64 = paymentResult.point_of_interaction?.transaction_data?.qr_code_base64;
      
      if (!qrCode || !qrCodeBase64) {
        console.error('Dados do PIX ausentes na resposta:', paymentResult);
        throw new functions.https.HttpsError(
          'internal',
          'QR Code do PIX não gerado pelo Mercado Pago'
        );
      }

      updateData['paymentInfo.paymentUrl'] = qrCode;
      updateData['paymentInfo.qrCodeBase64'] = qrCodeBase64;
    } else {
      const boletoUrl = paymentResult.transaction_details?.external_resource_url;
      const barCode = paymentResult.barcode?.content;
      
      if (!boletoUrl) {
        throw new functions.https.HttpsError(
          'internal',
          'URL do boleto não gerada pelo Mercado Pago'
        );
      }

      updateData['paymentInfo.boletoUrl'] = boletoUrl;
      updateData['paymentInfo.barCode'] = barCode;
      updateData['paymentInfo.boletoExpirationDate'] = paymentResult.date_of_expiration;
    }

    // 5. Salva no Firestore
    await invoiceRef.update(updateData);
    console.log('Dados salvos no Firestore com sucesso');

    // 6. Retorna os dados importantes
    const result = {
      paymentId: paymentResult.id,
      status: paymentResult.status,
      ...(tipoPagamento === 'pix' ? {
        qrCode: paymentResult.point_of_interaction?.transaction_data?.qr_code,
        qrCodeBase64: paymentResult.point_of_interaction?.transaction_data?.qr_code_base64
      } : {
        boletoUrl: paymentResult.transaction_details?.external_resource_url,
        barCode: paymentResult.barcode?.content,
        boletoExpirationDate: paymentResult.date_of_expiration
      })
    };

    console.log('Retornando resultado:', result);
    return { success: true, ...result };

  } catch (error) {
    console.error('Erro detalhado ao gerar pagamento:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      } : 'Sem dados de resposta'
    });

    // Se for um erro do HttpsError, repassa
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    // Caso contrário, cria um novo erro
    throw new functions.https.HttpsError(
      'internal',
      'Erro ao gerar pagamento: ' + (error.message || error)
    );
  }
});

// Webhook para receber notificações do Mercado Pago
// Função para testar webhook manualmente
exports.testWebhook = functions.https.onCall(async (data, context) => {
  try {
    // Verificar se o usuário está autenticado
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado');
    }

    const { paymentId } = data;
    if (!paymentId) {
      throw new functions.https.HttpsError('invalid-argument', 'paymentId é obrigatório');
    }

    console.log('🧪 TESTE: Simulando webhook para paymentId:', paymentId);

    // Simula o payload do webhook
    const webhookPayload = {
      type: 'payment',
      data: { id: paymentId },
      live_mode: true
    };

    // Buscar pagamento no Mercado Pago
    const paymentResponse = await axios.get(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const payment = paymentResponse.data;
    console.log('🧪 TESTE: Status do pagamento no MP:', payment.status);

    // Buscar fatura no Firebase - Método alternativo sem collectionGroup
    console.log('🧪 TESTE: Buscando fatura para paymentId:', paymentId);
    
    let invoiceDoc = null;
    let invoice = null;

    try {
      // Primeiro, tenta buscar através de todos os partners
      const partnersSnapshot = await db.collection('partners').get();
      console.log('🧪 TESTE: Buscando em', partnersSnapshot.size, 'partners');
      
      for (const partnerDoc of partnersSnapshot.docs) {
        console.log('🧪 TESTE: Verificando partner:', partnerDoc.id);
        
        // Busca nas invoices deste partner
        const invoicesQuery = await db
          .collection('partners')
          .doc(partnerDoc.id)
          .collection('invoices')
          .where('paymentInfo.paymentId', '==', parseInt(paymentId))
          .limit(1)
          .get();

        if (!invoicesQuery.empty) {
          invoiceDoc = invoicesQuery.docs[0];
          invoice = invoiceDoc.data();
          console.log('🧪 TESTE: Fatura encontrada no partner:', partnerDoc.id);
          break;
        }

        // Se não encontrou, tenta com paymentId como string
        const invoicesQuery2 = await db
          .collection('partners')
          .doc(partnerDoc.id)
          .collection('invoices')
          .where('paymentInfo.paymentId', '==', paymentId.toString())
          .limit(1)
          .get();

        if (!invoicesQuery2.empty) {
          invoiceDoc = invoicesQuery2.docs[0];
          invoice = invoiceDoc.data();
          console.log('🧪 TESTE: Fatura encontrada no partner (string):', partnerDoc.id);
          break;
        }

        // Tenta também com campo paymentId direto
        const invoicesQuery3 = await db
          .collection('partners')
          .doc(partnerDoc.id)
          .collection('invoices')
          .where('paymentId', '==', paymentId.toString())
          .limit(1)
          .get();

        if (!invoicesQuery3.empty) {
          invoiceDoc = invoicesQuery3.docs[0];
          invoice = invoiceDoc.data();
          console.log('🧪 TESTE: Fatura encontrada no partner (paymentId direto):', partnerDoc.id);
          break;
        }
      }

      if (!invoiceDoc) {
        // Lista algumas faturas para debug
        console.log('🧪 TESTE: Fatura não encontrada, listando algumas faturas:');
        const firstPartner = partnersSnapshot.docs[0];
        if (firstPartner) {
          const someInvoices = await db
            .collection('partners')
            .doc(firstPartner.id)
            .collection('invoices')
            .limit(5)
            .get();
          
          someInvoices.forEach(doc => {
            const data = doc.data();
            console.log('🧪 TESTE: Fatura exemplo:', {
              id: doc.id,
              paymentId: data.paymentId,
              paymentInfoPaymentId: data.paymentInfo?.paymentId,
              status: data.status || data.paymentInfo?.status
            });
          });
        }
        
        throw new functions.https.HttpsError('not-found', `Fatura não encontrada para paymentId: ${paymentId}`);
      }
    } catch (error) {
      console.error('🧪 TESTE: Erro na busca:', error);
      throw new functions.https.HttpsError('internal', `Erro na busca da fatura: ${error.message}`);
    }

    console.log('🧪 TESTE: Fatura encontrada:', {
      id: invoiceDoc.id,
      status: invoice.status || invoice.paymentInfo?.status,
      paymentId: invoice.paymentInfo?.paymentId || invoice.paymentId
    });

    // Simula a atualização do webhook
    if (payment.status === 'approved') {
      const updateData = {
        'paymentInfo.status': 'paid',
        'paymentInfo.paidAt': admin.firestore.Timestamp.now(),
        status: 'paid',
        paidAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      };
      
      await invoiceDoc.ref.update(updateData);
      console.log('🧪 TESTE: Fatura atualizada para PAID');
      
      return { 
        success: true, 
        message: 'Webhook testado e fatura atualizada com sucesso!',
        paymentStatus: payment.status,
        invoiceUpdated: true
      };
    }

    return { 
      success: true, 
      message: `Webhook testado. Status do pagamento: ${payment.status}`,
      paymentStatus: payment.status,
      invoiceUpdated: false
    };

  } catch (error) {
    console.error('🧪 TESTE: Erro:', error);
    throw new functions.https.HttpsError('internal', `Erro no teste: ${error.message}`);
  }
});

// Função para sincronizar status de pagamento manualmente (para debug/recuperação)
exports.syncPaymentStatus = functions.https.onCall(async (data, context) => {
  try {
    // Verificar se o usuário está autenticado
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado');
    }

    const { paymentId } = data;
    if (!paymentId) {
      throw new functions.https.HttpsError('invalid-argument', 'paymentId é obrigatório');
    }

    console.log('🔄 Sincronizando status do pagamento:', paymentId);

    // Buscar pagamento no Mercado Pago
    const paymentResponse = await axios.get(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const payment = paymentResponse.data;
    console.log('💰 Status atual do pagamento:', payment.status);

    // Buscar fatura no Firebase - Método alternativo sem collectionGroup
    let foundInvoiceDoc = null;
    let foundInvoice = null;

    try {
      const partnersSnapshot = await db.collection('partners').get();
      
      for (const partnerDoc of partnersSnapshot.docs) {
        // Busca nas invoices deste partner
        const invoicesQuery = await db
          .collection('partners')
          .doc(partnerDoc.id)
          .collection('invoices')
          .where('paymentInfo.paymentId', '==', parseInt(paymentId))
          .limit(1)
          .get();

        if (!invoicesQuery.empty) {
          foundInvoiceDoc = invoicesQuery.docs[0];
          foundInvoice = foundInvoiceDoc.data();
          break;
        }

        // Tenta como string
        const invoicesQuery2 = await db
          .collection('partners')
          .doc(partnerDoc.id)
          .collection('invoices')
          .where('paymentInfo.paymentId', '==', paymentId.toString())
          .limit(1)
          .get();

        if (!invoicesQuery2.empty) {
          foundInvoiceDoc = invoicesQuery2.docs[0];
          foundInvoice = foundInvoiceDoc.data();
          break;
        }

        // Tenta com paymentId direto
        const invoicesQuery3 = await db
          .collection('partners')
          .doc(partnerDoc.id)
          .collection('invoices')
          .where('paymentId', '==', paymentId.toString())
          .limit(1)
          .get();

        if (!invoicesQuery3.empty) {
          foundInvoiceDoc = invoicesQuery3.docs[0];
          foundInvoice = foundInvoiceDoc.data();
          break;
        }
      }

      if (!foundInvoiceDoc) {
        throw new functions.https.HttpsError('not-found', 'Fatura não encontrada');
      }
    } catch (error) {
      console.error('❌ Erro na busca da fatura:', error);
      throw new functions.https.HttpsError('internal', 'Erro na busca da fatura');
    }

    console.log('📄 Fatura encontrada:', foundInvoiceDoc.id, 'Status atual:', foundInvoice.status);

    // Atualizar status se necessário
    if (payment.status === 'approved' && foundInvoice.status !== 'paid') {
      await foundInvoiceDoc.ref.update({
        'paymentInfo.status': 'paid',
        'paymentInfo.paidAt': admin.firestore.Timestamp.now(),
        status: 'paid',
        paidAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      });
      
      console.log('✅ Fatura sincronizada com sucesso');
      return { success: true, message: 'Status sincronizado com sucesso', status: 'paid' };
    }

    return { success: true, message: 'Nenhuma atualização necessária', status: payment.status };

  } catch (error) {
    console.error('❌ Erro ao sincronizar status:', error);
    throw new functions.https.HttpsError('internal', 'Erro ao sincronizar status do pagamento');
  }
});

exports.mercadoPagoWebhook = functions.https.onRequest(async (request, response) => {
  try {
    console.log('🔔 Webhook recebido - Method:', request.method);
    console.log('🔔 Webhook recebido - Headers:', JSON.stringify(request.headers, null, 2));
    console.log('🔔 Webhook recebido - Query:', JSON.stringify(request.query, null, 2));
    console.log('🔔 Webhook recebido - Body:', JSON.stringify(request.body, null, 2));

    // Adiciona CORS para facilitar testes
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Hook-Token');

    // Verifica o método
    if (request.method === 'OPTIONS') {
      response.status(204).send('');
      return;
    }

    // Aceita tanto GET (para teste) quanto POST (para webhook real)
    if (request.method !== 'POST' && request.method !== 'GET') {
      console.log('❌ Método não permitido:', request.method);
      response.status(405).send('Método não permitido');
      return;
    }

    // Se for GET, responde OK para o teste do Mercado Pago
    if (request.method === 'GET') {
      console.log('✅ Teste de configuração do webhook');
      response.status(200).send('Webhook configurado corretamente');
      return;
    }

    const webhook = request.body;
    console.log('📦 Dados do webhook:', JSON.stringify(webhook, null, 2));

    // Verifica se temos topic e id nos query params (formato antigo do Mercado Pago)
    const { topic, id } = request.query;
    if (topic && id) {
      console.log('🔄 Recebido webhook no formato antigo:', { topic, id });
      // Se for um pagamento, processa normalmente
      if (topic === 'payment') {
        webhook.type = 'payment';
        webhook.data = { id };
      }
    }

    if (!webhook || (!webhook.type && !topic)) {
      console.error('❌ Payload inválido recebido');
      response.status(400).send('Payload inválido');
      return;
    }

    const paymentType = webhook.type || topic;
    if (paymentType !== 'payment') {
      console.log(`⏭️ Ignorando webhook - não é um pagamento (tipo: ${paymentType})`);
      response.status(200).send('Webhook ignorado - não é um pagamento');
      return;
    }

    // Verifica se é uma simulação de teste
    const paymentId = webhook.data?.id || id;
    const isTestPayment = webhook.live_mode === false || paymentId === '123456';
    
    if (isTestPayment) {
      console.log('🧪 Recebido webhook de teste do Mercado Pago');
      response.status(200).send('Webhook de teste processado com sucesso');
      return;
    }

    console.log('💳 Processando pagamento real:', paymentId);

    // Se não for teste, continua com o processamento normal
    try {
      // Busca os detalhes do pagamento na API do Mercado Pago
      console.log('🔍 Buscando detalhes do pagamento na API do Mercado Pago para ID:', paymentId);
      const paymentResponse = await axios.get(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const payment = paymentResponse.data;
      console.log('💰 Detalhes do pagamento:', JSON.stringify(payment, null, 2));

      // Busca a fatura correspondente
      console.log('🔍 Buscando fatura correspondente ao paymentId:', payment.id);
      
      // Primeira busca: usando paymentInfo.paymentId
      let invoicesQuery = await db
        .collectionGroup('invoices')
        .where('paymentInfo.paymentId', '==', payment.id)
        .limit(1)
        .get();

      // Se não encontrou, busca usando paymentId diretamente
      if (invoicesQuery.empty) {
        console.log('🔍 Primeira busca falhou, tentando com paymentId direto...');
        invoicesQuery = await db
          .collectionGroup('invoices')
          .where('paymentId', '==', payment.id)
          .limit(1)
          .get();
      }

      // Se ainda não encontrou, busca convertendo para string
      if (invoicesQuery.empty) {
        console.log('🔍 Segunda busca falhou, tentando com string...');
        invoicesQuery = await db
          .collectionGroup('invoices')
          .where('paymentInfo.paymentId', '==', payment.id.toString())
          .limit(1)
          .get();
      }

      // Se ainda não encontrou, busca paymentId como string
      if (invoicesQuery.empty) {
        console.log('🔍 Terceira busca falhou, tentando paymentId como string...');
        invoicesQuery = await db
          .collectionGroup('invoices')
          .where('paymentId', '==', payment.id.toString())
          .limit(1)
          .get();
      }

      if (invoicesQuery.empty) {
        console.error(`❌ Fatura não encontrada para o pagamento ${payment.id} após todas as tentativas`);
        console.log('🔍 Listando todas as faturas para debug...');
        
        // Debug: lista algumas faturas para ver a estrutura
        const allInvoicesQuery = await db
          .collectionGroup('invoices')
          .limit(5)
          .get();
        
        allInvoicesQuery.forEach(doc => {
          const data = doc.data();
          console.log('📄 Fatura encontrada (debug):', {
            id: doc.id,
            paymentId: data.paymentId,
            paymentInfo: data.paymentInfo,
            status: data.status
          });
        });
        
        response.status(404).send('Fatura não encontrada');
        return;
      }

      const invoiceDoc = invoicesQuery.docs[0];
      const invoice = invoiceDoc.data();
      console.log('📄 Fatura encontrada:', JSON.stringify(invoice, null, 2));

      // Atualiza o status da fatura
      if (payment.status === 'approved') {
        console.log('✅ Atualizando status da fatura para PAID');
        
        const updateData = {
          // Novos campos (paymentInfo)
          'paymentInfo.status': 'paid',
          'paymentInfo.paidAt': admin.firestore.Timestamp.now(),
          'paymentInfo.history': admin.firestore.FieldValue.arrayUnion({
            status: 'paid',
            date: new Date(),
            detail: 'Pagamento aprovado'
          }),
          // Campos diretos (compatibilidade)
          status: 'paid',
          paidAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        };
        
        await invoiceDoc.ref.update(updateData);
        console.log('✅ Fatura atualizada com sucesso - status:', payment.status);
      } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
        console.log(`❌ Pagamento rejeitado/cancelado (status: ${payment.status})`);
        await invoiceDoc.ref.update({
          'paymentInfo.status': 'failed',
          'paymentInfo.history': admin.firestore.FieldValue.arrayUnion({
            status: 'failed',
            date: new Date(),
            detail: `Pagamento ${payment.status}`
          }),
          status: 'pending', // Mantém pendente para permitir nova tentativa
          updatedAt: admin.firestore.Timestamp.now(),
        });
      } else {
        console.log(`ℹ️ Status do pagamento: ${payment.status} - aguardando aprovação`);
        await invoiceDoc.ref.update({
          'paymentInfo.status': payment.status,
          'paymentInfo.history': admin.firestore.FieldValue.arrayUnion({
            status: payment.status,
            date: new Date(),
            detail: `Status atualizado para ${payment.status}`
          }),
          updatedAt: admin.firestore.Timestamp.now(),
        });
      }

      response.status(200).send('Webhook processado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao processar pagamento:', error);
      console.error('Stack trace:', error.stack);
      if (error.response) {
        console.error('Resposta da API:', error.response.data);
      }
      response.status(500).send('Erro ao processar pagamento');
    }
  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    console.error('Stack trace:', error.stack);
    response.status(500).send('Erro ao processar webhook');
  }
});

exports.makePremium = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Você precisa estar autenticado para realizar esta ação.'
    );
  }

  const { establishmentId, days } = data;

  try {
    console.log('Recebido pedido de premium para:', establishmentId);
    const establishmentRef = admin.firestore().collection('partners').doc(establishmentId);
    const doc = await establishmentRef.get();
    
    if (!doc.exists) {
      throw new functions.https.HttpsError('not-found', 'Estabelecimento não encontrado');
    }

    let newExpiration = new Date();
    const currentData = doc.data();
    const store = currentData.store || {};

    // Se já for premium, adiciona dias à data atual de expiração
    if (store.isPremium && store.premiumExpiresAt) {
      newExpiration = new Date(store.premiumExpiresAt);
    }

    newExpiration.setDate(newExpiration.getDate() + days);

    // Atualiza dentro do objeto store
    await establishmentRef.update({
      'store.isPremium': true,
      'store.premiumExpiresAt': newExpiration.toISOString(),
      'store.premiumFeatures': {
        analytics: true,
        advancedReports: true,
        prioritySupport: true,
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('Premium ativado com sucesso para:', establishmentId);
    return {
      success: true,
      message: 'Plano Premium ativado com sucesso!',
      expiresAt: newExpiration.toISOString()
    };

  } catch (error) {
    console.error('Erro ao ativar premium:', error);
    throw new functions.https.HttpsError('internal', 'Erro ao ativar o plano premium');
  }
});

exports.checkPremiumStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Você precisa estar autenticado para realizar esta ação.'
    );
  }

  const { establishmentId } = data;

  try {
    const doc = await admin.firestore()
      .collection('partners')
      .doc(establishmentId)
      .get();

    if (!doc.exists) {
      throw new functions.https.HttpsError('not-found', 'Estabelecimento não encontrado');
    }

    const data = doc.data();
    const store = data.store || {};
    
    return {
      isPremium: store.isPremium || false,
      premiumExpiresAt: store.premiumExpiresAt || null
    };

  } catch (error) {
    console.error('Erro ao verificar status premium:', error);
    throw new functions.https.HttpsError('internal', 'Erro ao verificar status premium');
  }
});

// Função para atualizar documentos existentes com campos premium
exports.updatePartnerDocuments = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Apenas administradores podem executar esta função'
    );
  }

  try {
    const partnersRef = admin.firestore().collection('partners');
    const snapshot = await partnersRef.get();

    const batch = admin.firestore().batch();
    
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      
      // Só atualiza se os campos não existirem
      if (!data.hasOwnProperty('store')) {
        batch.update(doc.ref, {
          store: {
            isPremium: false,
            premiumExpiresAt: null,
            premiumFeatures: {
              analytics: false,
              advancedReports: false,
              prioritySupport: false,
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }
        });
      }
    });

    await batch.commit();
    return { success: true, message: 'Documentos atualizados com sucesso' };

  } catch (error) {
    console.error('Erro ao atualizar documentos:', error);
    throw new functions.https.HttpsError('internal', 'Erro ao atualizar documentos');
  }
});

// Função para definir a role do usuário
exports.setUserRole = functions.https.onCall((data, context) => {
  // Verifica se o usuário está autenticado
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated', 
      'É necessário estar autenticado para usar esta função.'
    );
  }

  const uid = context.auth.uid;
  const role = data.role;

  // Validação do papel (role)
  const validRoles = ['partner', 'admin', 'user'];
  if (!validRoles.includes(role)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Role inválida. As roles permitidas são: partner, admin, user'
    );
  }

  // Define a custom claim do usuário
  return admin.auth().setCustomUserClaims(uid, { role: role })
    .then(() => {
      // Atualiza o documento do usuário no Firestore também
      return admin.firestore().collection('partners').doc(uid).update({
        role: role,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    })
    .then(() => {
      return {
        success: true,
        message: `Role ${role} foi definida para o usuário ${uid}.`
      };
    })
    .catch((error) => {
      console.error('Erro ao definir role:', error);
      throw new functions.https.HttpsError('internal', error.message);
    });
});

// Trigger quando um novo usuário é criado
exports.onUserCreated = functions.auth.user().onCreate(async (userRecord) => {
  try {
    // Define a role padrão como 'partner' para novos usuários
    const defaultClaims = { role: 'partner' };
    
    await admin.auth().setCustomUserClaims(userRecord.uid, defaultClaims);
    
    // Cria o documento do usuário na coleção partners
    await admin.firestore().collection('partners').doc(userRecord.uid).set({
      email: userRecord.email,
      role: 'partner',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      store: {
        isPremium: false,
        premiumExpiresAt: null,
        premiumFeatures: {
          analytics: false,
          advancedReports: false,
          prioritySupport: false,
        }
      }
    });

    console.log(`Usuário ${userRecord.uid} criado com sucesso com role padrão`);
    return null;
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return null;
  }
});

// Opcional: Função para verificar a role atual do usuário
exports.getUserRole = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated', 
      'É necessário estar autenticado para usar esta função.'
    );
  }

  try {
    const user = await admin.auth().getUser(context.auth.uid);
    return {
      role: user.customClaims?.role || 'partner',
      email: user.email
    };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Função para detectar novas notificações e enviar push
exports.sendNotificationOnCreate = functions.firestore
  .document('partners/{partnerId}/notifications/{notificationId}')
  .onCreate(async (snapshot, context) => {
    try {
      // Extrair o ID do parceiro e da notificação dos parâmetros de contexto
      const partnerId = context.params.partnerId;
      const notificationId = context.params.notificationId;
      
      console.log(`Nova notificação criada: ${notificationId} para parceiro: ${partnerId}`);
      
      // Obter os dados da notificação
      const notificationData = snapshot.data();
      
      // Verificar se a notificação contém os dados necessários
      if (!notificationData) {
        console.error('Dados da notificação não encontrados');
        return null;
      }
      
      // Buscar o documento do parceiro para obter o token FCM
      const partnerDoc = await admin.firestore()
        .collection('partners')
        .doc(partnerId)
        .get();
      
      if (!partnerDoc.exists) {
        console.error(`Parceiro não encontrado: ${partnerId}`);
        return null;
      }
      
      const partnerData = partnerDoc.data();
      
      // Verificar se o parceiro tem tokens FCM registrados
      // Verificando tanto o formato fcmTokens quanto o formato notificationTokens para compatibilidade
      let fcmToken = null;
      
      if (partnerData.fcmTokens && partnerData.fcmTokens.token) {
        fcmToken = partnerData.fcmTokens.token;
      } else if (partnerData.notificationTokens && partnerData.notificationTokens.expoToken) {
        fcmToken = partnerData.notificationTokens.expoToken;
      }
      
      if (!fcmToken) {
        console.log(`Parceiro ${partnerId} não possui token FCM registrado`);
        return null;
      }
      
      // Preparar mensagem de notificação
      const message = {
        notification: {
          title: notificationData.title || 'Nova notificação',
          body: notificationData.body || 'Você recebeu uma nova notificação',
        },
        data: {
          type: notificationData.type || 'general',
          notificationId: notificationId,
          partnerId: partnerId,
          // Adicionar dados para navegação no app
          screen: notificationData.screen || 'notifications',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
        token: fcmToken,
      };
      
      // Enviar a notificação
      const response = await admin.messaging().send(message);
      console.log('Notificação enviada com sucesso:', response);
      
      // Atualizar o documento de notificação para indicar que foi enviado
      await snapshot.ref.update({
        sent: true,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      return response;
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      return null;
    }
  });

// Função agendada para gerar faturas automaticamente (executa todo dia às 20:25)
exports.generateInvoicesScheduled = functions.pubsub.schedule('25 20 * * *')
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    try {
      console.log('Iniciando verificação de faturas mensais...');
      const today = admin.firestore.Timestamp.now();
      console.log('Data atual:', today.toDate());
      
      const partnersRef = admin.firestore().collection('partners');
      const partnersSnapshot = await partnersRef.get();
      
      console.log(`Encontrados ${partnersSnapshot.size} parceiros`);
      
      const batch = admin.firestore().batch();
      const processedPartners = [];

      for (const partnerDoc of partnersSnapshot.docs) {
        console.log(`Processando parceiro: ${partnerDoc.id}`);
        
        // Busca a primeira compra do parceiro (primeira taxa não liquidada)
        const firstFeeQuery = await partnersRef
          .doc(partnerDoc.id)
          .collection('app_fees')
          .orderBy('completedAt', 'asc')
          .limit(1)
          .get();

        // Se não houver compras, pula este parceiro
        if (firstFeeQuery.empty) {
          console.log(`Nenhuma compra encontrada para o parceiro ${partnerDoc.id}`);
          continue;
        }

        const firstFee = firstFeeQuery.docs[0].data();
        const firstFeeDate = firstFee.completedAt;

        // Busca a última fatura do parceiro
        const lastInvoiceQuery = await partnersRef
          .doc(partnerDoc.id)
          .collection('invoices')
          .orderBy('createdAt', 'desc')
          .limit(1)
          .get();

        let shouldCreateInvoice = false;
        let referenceDate = firstFeeDate; // Data de referência começa com a primeira compra

        if (!lastInvoiceQuery.empty) {
          const lastInvoice = lastInvoiceQuery.docs[0].data();
          referenceDate = lastInvoice.createdAt; // Usa a data da última fatura como referência
          
          // Verifica se já se passou 1 mês desde a última fatura
          const monthsSinceLastInvoice = (today.toMillis() - referenceDate.toMillis()) / (1000 * 60 * 60 * 24 * 30);
          console.log(`Meses desde a última fatura: ${monthsSinceLastInvoice}`);
          
          if (monthsSinceLastInvoice >= 1) {
            shouldCreateInvoice = true;
          }
        } else {
          // Se não tem fatura anterior, verifica se já se passou 1 mês desde a primeira compra
          const monthsSinceFirstFee = (today.toMillis() - firstFeeDate.toMillis()) / (1000 * 60 * 60 * 24 * 30);
          console.log(`Meses desde a primeira compra: ${monthsSinceFirstFee}`);
          
          if (monthsSinceFirstFee >= 1) {
            shouldCreateInvoice = true;
          }
        }

        if (!shouldCreateInvoice) {
          console.log(`Ainda não é hora de gerar fatura para o parceiro ${partnerDoc.id}`);
          continue;
        }

        // Busca taxas não liquidadas (vamos filtrar o resto no código)
        const nonSettledFeesQuery = await partnersRef
          .doc(partnerDoc.id)
          .collection('app_fees')
          .where('settled', '==', false)
          .get();

        // Filtra no código as taxas sem fatura e dentro da data de referência
        const validFees = [];
        nonSettledFeesQuery.forEach(feeDoc => {
          const fee = feeDoc.data();
          // Verifica se não tem invoiceId e se completedAt é >= referenceDate
          if (!fee.invoiceId && fee.completedAt && fee.completedAt.toMillis() >= referenceDate.toMillis()) {
            validFees.push({ doc: feeDoc, data: fee });
          }
        });

        console.log(`Total de taxas não liquidadas sem fatura para ${partnerDoc.id}: ${validFees.length}`);

        if (validFees.length === 0) {
          console.log(`Nenhuma taxa não liquidada sem fatura encontrada para o parceiro ${partnerDoc.id}`);
          continue;
        }

        // Se encontrou taxas não liquidadas, vamos processá-las
        let totalFeeAmount = 0;
        const simplifiedDetails = [];

        validFees.forEach(({ doc: feeDoc, data: fee }) => {
          console.log(`Processando taxa não liquidada ${feeDoc.id}:`, fee);
          
          if (fee.appFee && typeof fee.appFee.value === 'number') {
            totalFeeAmount += fee.appFee.value;
            
            simplifiedDetails.push({
              id: fee.orderId,
              value: fee.appFee.value
            });
          }
        });

        console.log(`Valor total das taxas não liquidadas: ${totalFeeAmount}`);

        if (totalFeeAmount > 0) {
          // Busca informações do parceiro
          const partnerData = partnerDoc.data();
          
          // Verifica se os dados necessários existem
          if (!partnerData) {
            console.log(`Dados do parceiro ${partnerDoc.id} não encontrados`);
            continue;
          }

          // Cria a nova fatura na subcoleção correta
          const invoiceRef = partnersRef
            .doc(partnerDoc.id)
            .collection('invoices')
            .doc();

          // Define a data de vencimento como 7 dias a partir de hoje
          const endDate = admin.firestore.Timestamp.fromDate(
            new Date(today.toDate().setDate(today.toDate().getDate() + 7))
          );

          const newInvoice = {
            id: invoiceRef.id,
            partnerId: partnerDoc.id,
            status: 'pending',
            endDate: endDate,
            createdAt: today,
            totalAmount: totalFeeAmount,
            details: simplifiedDetails,
            partnerInfo: {
              name: partnerData.name || '',
              email: partnerData.email || '',
              cpf: partnerData.store?.document || ''  // Usando o documento da store que pode ser CPF ou CNPJ
            },
            paymentInfo: {
              paymentId: null,
              paymentMethod: null,
              paymentUrl: null,
              qrCode: null,
              qrCodeBase64: null
            }
          };

          console.log('Criando nova fatura:', newInvoice);

          // Atualiza as taxas como liquidadas
          const updatePromises = validFees.map(({ doc: feeDoc }) => {
            console.log(`Marcando taxa ${feeDoc.id} como liquidada`);
            return partnersRef
              .doc(partnerDoc.id)
              .collection('app_fees')
              .doc(feeDoc.id)
              .update({
                settled: true,
                invoiceId: invoiceRef.id,
                updatedAt: admin.firestore.Timestamp.now()
              });
          });

          await Promise.all(updatePromises);
          
          // Adiciona a fatura ao batch
          batch.set(invoiceRef, newInvoice);
          processedPartners.push(partnerDoc.id);
          
          console.log(`Fatura ${invoiceRef.id} criada para o parceiro ${partnerDoc.id}`);
        }
      }

      if (processedPartners.length > 0) {
        await batch.commit();
        console.log(`Faturas geradas para ${processedPartners.length} parceiros`);
      } else {
        console.log('Nenhuma fatura foi gerada neste ciclo');
      }

      return { success: true, processedPartners };
    } catch (error) {
      console.error('Erro ao gerar faturas:', error);
      return { success: false, error: error.message };
    }
});

// Função para corrigir taxas com invoiceId mas não liquidadas
exports.fixInconsistentFees = functions.https.onRequest(async (req, res) => {
  try {
    console.log('Iniciando correção de taxas inconsistentes...');
    
    const partnersRef = admin.firestore().collection('partners');
    const partnersSnapshot = await partnersRef.get();
    
    const batch = admin.firestore().batch();
    let fixedFeesCount = 0;

    for (const partnerDoc of partnersSnapshot.docs) {
      // Busca taxas não liquidadas mas com invoiceId
      const inconsistentFeesQuery = await partnersRef
        .doc(partnerDoc.id)
        .collection('app_fees')
        .where('settled', '==', false)
        .where('invoiceId', '!=', null)
        .get();

      console.log(`Encontradas ${inconsistentFeesQuery.size} taxas inconsistentes para ${partnerDoc.id}`);

      inconsistentFeesQuery.forEach(feeDoc => {
        console.log(`Corrigindo taxa ${feeDoc.id}`);
        batch.update(feeDoc.ref, { 
          settled: true,
          updatedAt: admin.firestore.Timestamp.now()
        });
        fixedFeesCount++;
      });
    }

    if (fixedFeesCount > 0) {
      await batch.commit();
      console.log(`${fixedFeesCount} taxas corrigidas com sucesso`);
      res.status(200).json({ success: true, fixedFeesCount });
    } else {
      console.log('Nenhuma taxa inconsistente encontrada');
      res.status(200).json({ success: true, fixedFeesCount: 0 });
    }
  } catch (error) {
    console.error('Erro ao corrigir taxas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Função para consultar detalhes de um pagamento no Mercado Pago (para debug)
exports.checkMercadoPagoPayment = functions.https.onCall(async (data, context) => {
  try {
    // Verificar se o usuário está autenticado
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado');
    }

    const { paymentId } = data;
    if (!paymentId) {
      throw new functions.https.HttpsError('invalid-argument', 'paymentId é obrigatório');
    }

    console.log('🔍 Consultando pagamento no Mercado Pago:', paymentId);

    // Buscar pagamento no Mercado Pago
    const paymentResponse = await axios.get(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const payment = paymentResponse.data;
    console.log('💰 Dados completos do pagamento:', JSON.stringify(payment, null, 2));

    // Extrair informações importantes
    const paymentInfo = {
      id: payment.id,
      status: payment.status,
      status_detail: payment.status_detail,
      transaction_amount: payment.transaction_amount,
      currency_id: payment.currency_id,
      date_created: payment.date_created,
      date_last_updated: payment.date_last_updated,
      payment_method: {
        id: payment.payment_method_id,
        type: payment.payment_type_id
      },
      payer: {
        id: payment.payer?.id,
        email: payment.payer?.email,
        type: payment.payer?.type
      },
      external_reference: payment.external_reference,
      description: payment.description,
      transaction_details: payment.transaction_details,
      point_of_interaction: payment.point_of_interaction
    };

    // Verificar se é PIX e se há informações específicas
    if (payment.payment_method_id === 'pix') {
      paymentInfo.pix_details = {
        qr_code_available: !!payment.point_of_interaction?.transaction_data?.qr_code,
        end_to_end_id: payment.point_of_interaction?.transaction_data?.end_to_end_id
      };
    }

    console.log('📊 Informações estruturadas do pagamento:', JSON.stringify(paymentInfo, null, 2));

    return { 
      success: true, 
      payment: paymentInfo,
      raw_data: payment // Dados completos para análise técnica
    };

  } catch (error) {
    console.error('❌ Erro ao consultar pagamento:', error);
    
    // Se for erro 404, o pagamento não existe
    if (error.response && error.response.status === 404) {
      throw new functions.https.HttpsError('not-found', 'Pagamento não encontrado no Mercado Pago');
    }
    
    // Se for erro 401, problema de autenticação
    if (error.response && error.response.status === 401) {
      throw new functions.https.HttpsError('permission-denied', 'Erro de autenticação com o Mercado Pago');
    }
    
    throw new functions.https.HttpsError('internal', 'Erro ao consultar pagamento no Mercado Pago: ' + error.message);
  }
});

// Função para limpar dados de pagamento de uma fatura (para testes/debug)
exports.clearInvoicePayment = functions.https.onCall(async (data, context) => {
  try {
    // Verificar se o usuário está autenticado
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado');
    }

    const { invoiceId, partnerId } = data;
    if (!invoiceId || !partnerId) {
      throw new functions.https.HttpsError('invalid-argument', 'invoiceId e partnerId são obrigatórios');
    }

    console.log('🧹 Limpando dados de pagamento para fatura:', invoiceId);

    // Buscar a fatura
    const invoiceRef = db.collection('partners').doc(partnerId).collection('invoices').doc(invoiceId);
    const invoiceSnap = await invoiceRef.get();
    
    if (!invoiceSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Fatura não encontrada');
    }

    // Limpar todos os dados de pagamento
    const updateData = {
      // Remove campos de pagamento
      paymentInfo: admin.firestore.FieldValue.delete(),
      paymentId: admin.firestore.FieldValue.delete(),
      paymentMethod: admin.firestore.FieldValue.delete(),
      paymentData: admin.firestore.FieldValue.delete(),
      paidAt: admin.firestore.FieldValue.delete(),
      
      // Volta status para pending
      status: 'pending',
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await invoiceRef.update(updateData);
    
    console.log('✅ Dados de pagamento limpos com sucesso');
    
    return { 
      success: true, 
      message: 'Dados de pagamento limpos com sucesso. Você pode gerar um novo pagamento agora.' 
    };

  } catch (error) {
    console.error('❌ Erro ao limpar dados de pagamento:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'Erro ao limpar dados de pagamento: ' + error.message);
  }
}); 