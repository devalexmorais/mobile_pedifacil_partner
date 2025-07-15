const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const axios = require('axios');

let serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Mapeamento de estados para abreviações
const stateAbbreviations = {
  'Acre': 'AC',
  'Alagoas': 'AL',
  'Amapá': 'AP',
  'Amazonas': 'AM',
  'Bahia': 'BA',
  'Ceará': 'CE',
  'Distrito Federal': 'DF',
  'Espírito Santo': 'ES',
  'Goiás': 'GO',
  'Maranhão': 'MA',
  'Mato Grosso': 'MT',
  'Mato Grosso do Sul': 'MS',
  'Minas Gerais': 'MG',
  'Pará': 'PA',
  'Paraíba': 'PB',
  'Paraná': 'PR',
  'Pernambuco': 'PE',
  'Piauí': 'PI',
  'Rio de Janeiro': 'RJ',
  'Rio Grande do Norte': 'RN',
  'Rio Grande do Sul': 'RS',
  'Rondônia': 'RO',
  'Roraima': 'RR',
  'Santa Catarina': 'SC',
  'São Paulo': 'SP',
  'Sergipe': 'SE',
  'Tocantins': 'TO'
};

function mapStateToAbbreviation(stateName) {
  if (!stateName) return '';
  // Se já é uma abreviação (2 caracteres), retorna como está
  if (stateName.length === 2) return stateName.toUpperCase();
  // Procura na lista de mapeamentos
  return stateAbbreviations[stateName] || '';
}

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

// 🔒 SISTEMA DE BLOQUEIO SEGURO
// Função para verificar status de pagamento e aplicar bloqueios
async function verificarEAplicarBloqueio(partnerId) {
  try {
    console.log('🔒 VERIFICANDO STATUS DE BLOQUEIO para parceiro:', partnerId);
    
    // Busca todas as faturas não pagas do parceiro
    const invoicesQuery = await db
      .collection('partners')
      .doc(partnerId)
      .collection('invoices')
      .where('status', 'in', ['pending', 'overdue'])
      .orderBy('endDate', 'asc')
      .get();
    
    if (invoicesQuery.empty) {
      console.log('🔒 ✅ Nenhuma fatura pendente - parceiro liberado');
      return {
        isBlocked: false,
        daysPastDue: 0,
        overdueInvoice: null,
        blockingReason: null
      };
    }
    
    const today = new Date();
    let maxDaysPastDue = 0;
    let overdueInvoice = null;
    
    // Verifica cada fatura não paga
    invoicesQuery.docs.forEach(doc => {
      const invoice = doc.data();
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
    const blockingReason = isBlocked 
      ? `Fatura vencida há ${maxDaysPastDue} dias. Pagamento necessário para continuar operando.`
      : null;
    
    console.log('🔒 RESULTADO DA VERIFICAÇÃO:', {
      isBlocked,
      daysPastDue: maxDaysPastDue,
      hasOverdueInvoice: !!overdueInvoice,
      blockingReason
    });
    
    return {
      isBlocked,
      daysPastDue: maxDaysPastDue,
      overdueInvoice,
      blockingReason
    };
    
  } catch (error) {
    console.error('🔒 ❌ ERRO ao verificar bloqueio:', error);
    // Em caso de erro, não bloqueia (fail-safe)
    return {
      isBlocked: false,
      daysPastDue: 0,
      overdueInvoice: null,
      blockingReason: null
    };
  }
}

// Função para forçar fechamento do estabelecimento quando bloqueado
async function forcarFechamentoSeNecessario(partnerId, bloqueioInfo) {
  try {
    if (!bloqueioInfo.isBlocked) {
      console.log('🔒 Parceiro não está bloqueado - não precisa forçar fechamento');
      return;
    }
    
    console.log('🔒 FORÇANDO FECHAMENTO - parceiro bloqueado há', bloqueioInfo.daysPastDue, 'dias');
    
    // Busca o documento do parceiro
    const partnerRef = db.collection('partners').doc(partnerId);
    const partnerDoc = await partnerRef.get();
    
    if (!partnerDoc.exists) {
      console.error('🔒 ❌ Parceiro não encontrado:', partnerId);
      return;
    }
    
    const partnerData = partnerDoc.data();
    
    // Se o estabelecimento está aberto, força o fechamento
    if (partnerData.establishmentStatus?.isOpen) {
      console.log('🔒 FECHANDO estabelecimento automaticamente por bloqueio');
      
      await partnerRef.update({
        'establishmentStatus.isOpen': false,
        'establishmentStatus.lastStatusChange': admin.firestore.Timestamp.now(),
        'establishmentStatus.statusChangeReason': `Fechado automaticamente - ${bloqueioInfo.blockingReason}`,
        'establishmentStatus.operationMode': 'blocked',
        'establishmentStatus.blockedSince': admin.firestore.Timestamp.now(),
        'establishmentStatus.blockingReason': bloqueioInfo.blockingReason,
        updatedAt: admin.firestore.Timestamp.now()
      });
      
      console.log('🔒 ✅ Estabelecimento fechado automaticamente por bloqueio');
    } else {
      console.log('🔒 Estabelecimento já estava fechado');
    }
    
  } catch (error) {
    console.error('🔒 ❌ ERRO ao forçar fechamento:', error);
  }
}

// Função de segurança para cancelar pagamentos pendentes e evitar duplicatas
async function cancelarPagamentosPendentesSeguro(invoice, novoTipoPagamento, invoiceRef) {
  try {
    console.log('🛡️ SEGURANÇA: Verificando pagamentos pendentes para evitar duplicatas...');
    console.log('🛡️ Novo tipo solicitado:', novoTipoPagamento);
    
    // Verifica se já existe um pagamento pendente
    if (!invoice.paymentInfo || !invoice.paymentInfo.paymentId) {
      console.log('🛡️ Nenhum pagamento anterior encontrado - prosseguindo');
      return;
    }
    
    const pagamentoExistente = invoice.paymentInfo;
    console.log('🛡️ Pagamento existente encontrado:', {
      paymentId: pagamentoExistente.paymentId,
      status: pagamentoExistente.status,
      method: pagamentoExistente.paymentMethod
    });
    
    // Se o pagamento já está pago ou falhou, não precisa cancelar
    if (pagamentoExistente.status === 'paid' || pagamentoExistente.status === 'failed') {
      console.log('🛡️ Pagamento anterior já finalizado (paid/failed) - não precisa cancelar');
      return;
    }
    
    // Se o tipo de pagamento é o mesmo, não precisa cancelar
    if (pagamentoExistente.paymentMethod === novoTipoPagamento) {
      console.log('🛡️ Mesmo tipo de pagamento - não precisa cancelar');
      return;
    }
    
    // AQUI É ONDE A SEGURANÇA ATUA: tipos diferentes, cancela o anterior
    console.log('🛡️ CANCELANDO pagamento anterior (tipo diferente):');
    console.log(`🛡️ Anterior: ${pagamentoExistente.paymentMethod} | Novo: ${novoTipoPagamento}`);
    
    try {
      // 1. Tenta cancelar no Mercado Pago
      console.log('🛡️ Tentando cancelar no Mercado Pago:', pagamentoExistente.paymentId);
      
      const cancelResponse = await axios.put(
        `https://api.mercadopago.com/v1/payments/${pagamentoExistente.paymentId}`,
        { status: 'cancelled' },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000 // 10 segundos de timeout
        }
      );
      
      console.log('🛡️ ✅ Pagamento cancelado no Mercado Pago:', cancelResponse.data.status);
      
      // Verifica se o cancelamento realmente funcionou
      const foiCancelado = await verificarCancelamentoMP(pagamentoExistente.paymentId);
      if (foiCancelado) {
        console.log('🛡️ ✅ Cancelamento confirmado no Mercado Pago');
      } else {
        console.warn('🛡️ ⚠️ Cancelamento pode não ter sido efetivo no MP');
      }
      
    } catch (cancelError) {
      console.warn('🛡️ ⚠️ Erro ao cancelar no Mercado Pago (continuando mesmo assim):', {
        status: cancelError.response?.status,
        data: cancelError.response?.data,
        message: cancelError.message
      });
      
      // Não falha aqui - continua com a limpeza local mesmo se não conseguir cancelar no MP
    }
    
    // 2. SEMPRE limpa os dados locais (independente do cancelamento no MP)
    console.log('🛡️ Limpando dados de pagamento local na fatura...');
    
    const updateData = {
      // Remove todos os dados de pagamento
      'paymentInfo.paymentId': admin.firestore.FieldValue.delete(),
      'paymentInfo.paymentMethod': admin.firestore.FieldValue.delete(),
      'paymentInfo.paymentUrl': admin.firestore.FieldValue.delete(),
      'paymentInfo.qrCodeBase64': admin.firestore.FieldValue.delete(),
      'paymentInfo.boletoUrl': admin.firestore.FieldValue.delete(),
      'paymentInfo.barCode': admin.firestore.FieldValue.delete(),
      'paymentInfo.boletoExpirationDate': admin.firestore.FieldValue.delete(),
      'paymentInfo.status': 'cancelled',
      'paymentInfo.history': admin.firestore.FieldValue.arrayUnion({
        status: 'cancelled',
        date: new Date(),
        detail: `Cancelado por segurança - novo ${novoTipoPagamento} solicitado`
      }),
      
      // Volta status da fatura para pending
      status: 'pending',
      updatedAt: admin.firestore.Timestamp.now(),
    };
    
    await invoiceRef.update(updateData);
    console.log('🛡️ ✅ Dados de pagamento anterior limpos com sucesso');
    
    // 3. Log de segurança
    console.log('🛡️ ✅ SEGURANÇA APLICADA: Pagamento anterior cancelado e limpo');
    console.log('🛡️ ✅ Agora pode gerar novo pagamento do tipo:', novoTipoPagamento);
    
  } catch (error) {
    console.error('🛡️ ❌ ERRO CRÍTICO na função de segurança:', error);
    // Em caso de erro crítico, ainda permite continuar mas loga o problema
    console.error('🛡️ ❌ Continuando com geração do pagamento mesmo com erro de segurança');
  }
}

// Função de segurança adicional para verificar outras faturas pendentes do mesmo parceiro
async function verificarOutrasFaturasPendentes(partnerId, faturaAtualId) {
  try {
    console.log('🛡️ SEGURANÇA ADICIONAL: Verificando outras faturas pendentes...');
    
    // Busca outras faturas pendentes do mesmo parceiro (excluindo a atual)
    const outrasForturasQuery = await db
      .collection('partners')
      .doc(partnerId)
      .collection('invoices')
      .where('status', '==', 'pending')
      .get();
    
    const outrasFacturas = outrasForturasQuery.docs.filter(doc => doc.id !== faturaAtualId);
    
    if (outrasFacturas.length === 0) {
      console.log('🛡️ ✅ Nenhuma outra fatura pendente encontrada');
      return;
    }
    
    console.log(`🛡️ ⚠️ ATENÇÃO: Encontradas ${outrasFacturas.length} outras faturas pendentes`);
    
    // Para cada fatura pendente, cancela seus pagamentos
    for (const faturaDoc of outrasFacturas) {
      const faturaData = faturaDoc.data();
      console.log(`🛡️ Processando fatura pendente: ${faturaDoc.id}`);
      
      if (faturaData.paymentInfo && faturaData.paymentInfo.paymentId) {
        console.log(`🛡️ Cancelando pagamento da fatura ${faturaDoc.id}: ${faturaData.paymentInfo.paymentId}`);
        
        try {
          // Cancela no Mercado Pago
          await axios.put(
            `https://api.mercadopago.com/v1/payments/${faturaData.paymentInfo.paymentId}`,
            { status: 'cancelled' },
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              timeout: 5000
            }
          );
          
          console.log(`🛡️ ✅ Pagamento da fatura ${faturaDoc.id} cancelado no MP`);
        } catch (error) {
          console.warn(`🛡️ ⚠️ Erro ao cancelar pagamento da fatura ${faturaDoc.id}:`, error.message);
        }
        
        // Limpa dados de pagamento da fatura
        await faturaDoc.ref.update({
          'paymentInfo.status': 'cancelled',
          'paymentInfo.history': admin.firestore.FieldValue.arrayUnion({
            status: 'cancelled',
            date: new Date(),
            detail: 'Cancelado por segurança - nova fatura sendo processada'
          }),
          updatedAt: admin.firestore.Timestamp.now(),
        });
        
        console.log(`🛡️ ✅ Dados da fatura ${faturaDoc.id} atualizados`);
      }
    }
    
    console.log('🛡️ ✅ SEGURANÇA ADICIONAL: Outras faturas pendentes processadas');
    
  } catch (error) {
    console.error('🛡️ ❌ Erro na verificação de outras faturas pendentes:', error);
    // Não falha a operação principal
  }
}

// Função auxiliar para verificar se um pagamento foi cancelado no Mercado Pago
async function verificarCancelamentoMP(paymentId) {
  try {
    console.log('🔍 Verificando status do pagamento cancelado:', paymentId);
    
    const response = await axios.get(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: 5000
      }
    );
    
    const status = response.data.status;
    console.log(`🔍 Status atual no MP: ${status}`);
    
    return status === 'cancelled';
  } catch (error) {
    console.warn('🔍 ⚠️ Erro ao verificar cancelamento no MP:', error.message);
    return false; // Assume que não foi cancelado se houver erro
  }
}

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

    // ✅ FUNÇÃO DE SEGURANÇA: Cancelar pagamentos pendentes para evitar duplicatas
    await cancelarPagamentosPendentesSeguro(invoice, tipoPagamento, invoiceRef);
    
    // ✅ SEGURANÇA ADICIONAL: Verificar se existem outras faturas pendentes do mesmo parceiro
    await verificarOutrasFaturasPendentes(partnerId, invoiceId);
    
    // Recarrega a fatura após possível cancelamento
    const updatedInvoiceSnap = await invoiceRef.get();
    const updatedInvoice = updatedInvoiceSnap.data();
    
    // ✅ VERIFICAÇÃO: Se já existe um pagamento válido do mesmo tipo, retorna ele
    if (updatedInvoice.paymentInfo && updatedInvoice.paymentInfo.paymentId && 
        updatedInvoice.paymentInfo.status !== 'failed' && updatedInvoice.paymentInfo.status !== 'cancelled' &&
        updatedInvoice.paymentInfo.paymentMethod === tipoPagamento) {
      console.log('✅ Retornando pagamento existente do mesmo tipo após verificação de segurança');
      
      // Retorna os dados do pagamento existente
      const existingResult = {
        paymentId: updatedInvoice.paymentInfo.paymentId,
        status: updatedInvoice.paymentInfo.status,
        ...(tipoPagamento === 'pix' ? {
          qrCode: updatedInvoice.paymentInfo.paymentUrl,
          qrCodeBase64: updatedInvoice.paymentInfo.qrCodeBase64
        } : {
          boletoUrl: updatedInvoice.paymentInfo.boletoUrl,
          barCode: updatedInvoice.paymentInfo.barCode,
          boletoExpirationDate: updatedInvoice.paymentInfo.boletoExpirationDate
        })
      };
      
      return { success: true, existing: true, ...existingResult };
    }

    // 2. Buscar dados do parceiro
    const partnerRef = db.collection('partners').doc(partnerId);
    const partnerSnap = await partnerRef.get();
    
    if (!partnerSnap.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Dados do parceiro não encontrados!'
      );
    }
    
    const partnerData = partnerSnap.data();
    console.log('Dados do parceiro:', JSON.stringify(partnerData, null, 2));

    // 3. Monta os dados do pagamento
    const payment_data = {
      transaction_amount: updatedInvoice.totalAmount || 1.00,
      description: `Fatura PediFácil - ${updatedInvoice.id}`,
      payment_method_id: tipoPagamento === 'pix' ? 'pix' : 'bolbradesco',
              payer: {
          email: partnerData.email || updatedInvoice.partnerInfo?.email || 'test@test.com',
          first_name: (partnerData.name || updatedInvoice.partnerInfo?.name || 'Test').split(' ')[0],
          last_name: (partnerData.name || updatedInvoice.partnerInfo?.name || 'Test').split(' ').slice(1).join(' ') || 'User',
          identification: {
            type: 'CPF',
            number: (partnerData.store?.document || partnerData.cpf || updatedInvoice.partnerInfo?.cpf || '19119119100').replace(/\D/g, '')
          },
          address: tipoPagamento === 'boleto' ? {
            zip_code: (partnerData.address?.zip_code || updatedInvoice.partnerInfo?.address?.cep || '').replace(/\D/g, ''),
            street_name: partnerData.address?.street || updatedInvoice.partnerInfo?.address?.street || '',
            street_number: partnerData.address?.number || updatedInvoice.partnerInfo?.address?.number || '',
            neighborhood: partnerData.address?.neighborhoodName || updatedInvoice.partnerInfo?.address?.neighborhood || '',
            city: partnerData.address?.cityName || updatedInvoice.partnerInfo?.address?.city || '',
            federal_unit: mapStateToAbbreviation(partnerData.address?.stateName || updatedInvoice.partnerInfo?.address?.state || '')
          } : undefined
        }
    };

    // Validação dos campos de endereço para boleto
    if (tipoPagamento === 'boleto') {
      console.log('🔍 Validando campos de endereço para boleto:', JSON.stringify(payment_data.payer.address, null, 2));
      
      const requiredFields = ['zip_code', 'street_name', 'street_number', 'neighborhood', 'city', 'federal_unit'];
      const missingFields = requiredFields.filter(field => !payment_data.payer.address[field]);
      
      if (missingFields.length > 0) {
        console.error('❌ Campos de endereço em falta:', missingFields);
        console.error('📊 Endereço completo disponível:', {
          partnerData_address: partnerData.address,
          invoice_partnerInfo: updatedInvoice.partnerInfo
        });
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Para gerar um boleto, os seguintes campos de endereço são obrigatórios: ${missingFields.join(', ')}`
        );
      }
      
      console.log('✅ Todos os campos de endereço estão presentes para o boleto');
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
      
      let paymentResponse;
      try {
        paymentResponse = await axios.get(
          `https://api.mercadopago.com/v1/payments/${paymentId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            timeout: 10000 // 10 segundos de timeout
          }
        );
      } catch (apiError) {
        console.error('❌ Erro ao consultar API do Mercado Pago:', apiError.response?.status, apiError.response?.data);
        // Se for erro 404, pagamento não existe - retorna 200 para evitar reenvio
        if (apiError.response?.status === 404) {
          console.log('📤 Pagamento não encontrado na API - retornando 200');
          response.status(200).send('Pagamento não encontrado na API do Mercado Pago');
          return;
        }
        // Para outros erros de API, tenta novamente mais tarde
        response.status(500).send('Erro temporário na consulta da API do Mercado Pago');
        return;
      }

      const payment = paymentResponse.data;
      console.log('💰 Status do pagamento:', payment.status);

      // Busca a fatura correspondente usando método mais robusto
      console.log('🔍 Buscando fatura correspondente ao paymentId:', payment.id);
      
      let invoiceDoc = null;
      let invoice = null;

      try {
        // Busca através de todos os partners de forma mais segura
        const partnersSnapshot = await db.collection('partners').limit(100).get(); // Limita para evitar timeout
        console.log('🔍 Verificando', partnersSnapshot.size, 'partners');
        
        // Tenta múltiplas estratégias de busca
        const searchStrategies = [
          // Estratégia 1: paymentInfo.paymentId como number
          async (partnerDoc) => {
            return await db
              .collection('partners')
              .doc(partnerDoc.id)
              .collection('invoices')
              .where('paymentInfo.paymentId', '==', parseInt(payment.id))
              .limit(1)
              .get();
          },
          // Estratégia 2: paymentInfo.paymentId como string
          async (partnerDoc) => {
            return await db
              .collection('partners')
              .doc(partnerDoc.id)
              .collection('invoices')
              .where('paymentInfo.paymentId', '==', payment.id.toString())
              .limit(1)
              .get();
          },
          // Estratégia 3: paymentId direto como string
          async (partnerDoc) => {
            return await db
              .collection('partners')
              .doc(partnerDoc.id)
              .collection('invoices')
              .where('paymentId', '==', payment.id.toString())
              .limit(1)
              .get();
          }
        ];

        searchLoop: for (const partnerDoc of partnersSnapshot.docs) {
          for (const strategy of searchStrategies) {
            try {
              const queryResult = await strategy(partnerDoc);
              if (!queryResult.empty) {
                invoiceDoc = queryResult.docs[0];
                invoice = invoiceDoc.data();
                console.log('✅ Fatura encontrada no partner:', partnerDoc.id);
                break searchLoop;
              }
            } catch (queryError) {
              console.warn(`⚠️ Erro em consulta específica para partner ${partnerDoc.id}:`, queryError.message);
              // Continua tentando outras estratégias
            }
          }
        }

        if (!invoiceDoc) {
          console.warn(`⚠️ Fatura não encontrada para o pagamento ${payment.id}`);
          // Para debug limitado e seguro
          try {
            const firstPartner = partnersSnapshot.docs[0];
            if (firstPartner) {
              const someInvoices = await db
                .collection('partners')
                .doc(firstPartner.id)
                .collection('invoices')
                .limit(3)
                .get();
              
              console.log('📄 Exemplos de faturas encontradas (debug limitado):');
              someInvoices.docs.slice(0, 2).forEach(doc => {
                const data = doc.data();
                console.log('📄 Fatura exemplo:', {
                  id: doc.id,
                  paymentId: data.paymentId,
                  paymentInfoPaymentId: data.paymentInfo?.paymentId,
                  status: data.status
                });
              });
            }
          } catch (debugError) {
            console.warn('⚠️ Erro no debug das faturas:', debugError.message);
          }
          
          // Retorna 200 para o Mercado Pago não tentar reenviar
          console.log('📤 Retornando 200 para evitar reenvio do webhook');
          response.status(200).send('Webhook processado - fatura não encontrada mas pagamento válido');
          return;
        }
      } catch (searchError) {
        console.error('❌ Erro crítico na busca de faturas:', searchError);
        response.status(500).send('Erro na busca de faturas');
        return;
      }

      console.log('📄 Fatura encontrada:', {
        id: invoiceDoc.id,
        currentStatus: invoice.status,
        paymentId: invoice.paymentInfo?.paymentId
      });

      // Atualiza o status da fatura de forma segura
      try {
        if (payment.status === 'approved') {
          console.log('✅ Atualizando status da fatura para PAID');
          
          const updateData = {
            // Novos campos (paymentInfo)
            'paymentInfo.status': 'paid',
            'paymentInfo.paidAt': admin.firestore.Timestamp.now(),
            'paymentInfo.history': admin.firestore.FieldValue.arrayUnion({
              status: 'paid',
              date: new Date(),
              detail: 'Pagamento aprovado via webhook'
            }),
            // Campos diretos (compatibilidade)
            status: 'paid',
            paidAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now(),
          };
          
          await invoiceDoc.ref.update(updateData);
          console.log('✅ Fatura atualizada com sucesso');
        } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
          console.log(`❌ Pagamento rejeitado/cancelado (status: ${payment.status})`);
          await invoiceDoc.ref.update({
            'paymentInfo.status': 'failed',
            'paymentInfo.history': admin.firestore.FieldValue.arrayUnion({
              status: 'failed',
              date: new Date(),
              detail: `Pagamento ${payment.status} via webhook`
            }),
            status: 'pending', // Mantém pendente para permitir nova tentativa
            updatedAt: admin.firestore.Timestamp.now(),
          });
        } else {
          console.log(`ℹ️ Status do pagamento: ${payment.status} - aguardando`);
          await invoiceDoc.ref.update({
            'paymentInfo.status': payment.status,
            'paymentInfo.history': admin.firestore.FieldValue.arrayUnion({
              status: payment.status,
              date: new Date(),
              detail: `Status atualizado para ${payment.status} via webhook`
            }),
            updatedAt: admin.firestore.Timestamp.now(),
          });
        }
      } catch (updateError) {
        console.error('❌ Erro ao atualizar fatura:', updateError);
        response.status(500).send('Erro ao atualizar fatura');
        return;
      }

      response.status(200).send('Webhook processado com sucesso');
    } catch (processingError) {
      console.error('❌ Erro ao processar pagamento:', processingError);
      console.error('Stack trace:', processingError.stack);
      response.status(500).send('Erro ao processar pagamento');
    }
  } catch (generalError) {
    console.error('❌ Erro geral ao processar webhook:', generalError);
    console.error('Stack trace:', generalError.stack);
    response.status(500).send('Erro geral ao processar webhook');
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
    
    // Verifica se o documento já existe (criado pelo registerService)
    const existingDoc = await admin.firestore().collection('partners').doc(userRecord.uid).get();
    
    if (existingDoc.exists) {
      console.log(`Documento do parceiro ${userRecord.uid} já existe - apenas atualizando campos necessários`);
      
      // Se o documento já existe, apenas adiciona/atualiza campos específicos que podem estar faltando
      await admin.firestore().collection('partners').doc(userRecord.uid).update({
        email: userRecord.email, // Garante que o email está correto
        role: 'partner', // Garante que a role está definida
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        // Adiciona store apenas se não existir
        ...(existingDoc.data().store ? {} : {
          'store.isPremium': false,
          'store.premiumExpiresAt': null,
          'store.premiumFeatures.analytics': false,
          'store.premiumFeatures.advancedReports': false,
          'store.premiumFeatures.prioritySupport': false,
        })
      });
    } else {
      // Se o documento não existe, cria um novo (caso raro - usuário criado fora do fluxo de registro)
      console.log(`Criando novo documento para parceiro ${userRecord.uid}`);
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
    }

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

// Função agendada para gerar faturas automaticamente (executa todo dia às 00:00)
exports.generateInvoicesScheduled = functions.pubsub.schedule('0 0 * * *')
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

          // Busca créditos disponíveis do parceiro
          console.log(`🔍 Buscando créditos disponíveis para o parceiro ${partnerDoc.id}`);
          const creditsQuery = await partnersRef
            .doc(partnerDoc.id)
            .collection('credits')
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'asc')
            .get();

          let availableCredits = [];
          if (!creditsQuery.empty) {
            availableCredits = creditsQuery.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            console.log(`💰 Créditos disponíveis encontrados: ${availableCredits.length}`);
            console.log(`💳 Valor total dos créditos: R$ ${availableCredits.reduce((sum, credit) => sum + (credit.value || 0), 0).toFixed(2)}`);
          }

          // Aplica créditos à fatura
          let finalAmount = totalFeeAmount;
          let appliedCredits = [];
          let appliedCreditsAmount = 0;

          if (availableCredits.length > 0) {
            console.log(`🔄 Aplicando créditos à fatura...`);
            
            for (const credit of availableCredits) {
              if (finalAmount <= 0) break;

              const creditValue = credit.value || 0;
              const creditToApply = Math.min(creditValue, finalAmount);
              
              appliedCredits.push({
                creditId: credit.id,
                couponCode: credit.couponCode,
                originalValue: creditValue,
                appliedValue: creditToApply
              });

              appliedCreditsAmount += creditToApply;
              finalAmount -= creditToApply;

              console.log(`💳 Crédito ${credit.couponCode}: R$ ${creditToApply.toFixed(2)} aplicado`);
            }

            console.log(`✅ Total de créditos aplicados: R$ ${appliedCreditsAmount.toFixed(2)}`);
            console.log(`💸 Valor final da fatura após créditos: R$ ${finalAmount.toFixed(2)}`);
          }

          // Se o valor final for 0 ou negativo, não cria fatura
          if (finalAmount <= 0) {
            console.log(`🎉 Fatura totalmente coberta por créditos! Não será criada fatura.`);
            
            // Marca as taxas como liquidadas
            const updatePromises = validFees.map(({ doc: feeDoc }) => {
              console.log(`Marcando taxa ${feeDoc.id} como liquidada`);
              return partnersRef
                .doc(partnerDoc.id)
                .collection('app_fees')
                .doc(feeDoc.id)
                .update({
                  settled: true,
                  updatedAt: admin.firestore.Timestamp.now()
                });
            });

            await Promise.all(updatePromises);
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
            totalAmount: finalAmount,
            originalAmount: totalFeeAmount,
            appliedCreditsAmount: appliedCreditsAmount,
            appliedCredits: appliedCredits,
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

          // Atualiza os créditos aplicados
          if (appliedCredits.length > 0) {
            console.log(`🔄 Atualizando status dos créditos aplicados...`);
            
            for (const appliedCredit of appliedCredits) {
              const creditRef = partnersRef
                .doc(partnerDoc.id)
                .collection('credits')
                .doc(appliedCredit.creditId);
              
              const creditDoc = await creditRef.get();
              if (creditDoc.exists) {
                const creditData = creditDoc.data();
                const originalValue = creditData.value || 0;
                const appliedValue = appliedCredit.appliedValue;
                
                if (appliedValue >= originalValue) {
                  // Crédito totalmente usado
                  await creditRef.update({
                    status: 'applied',
                    appliedAt: admin.firestore.Timestamp.now(),
                    invoiceId: invoiceRef.id
                  });
                  console.log(`✅ Crédito ${appliedCredit.couponCode} totalmente aplicado`);
                } else {
                  // Crédito parcialmente usado
                  const remainingValue = originalValue - appliedValue;
                  
                  // Atualiza o crédito atual
                  await creditRef.update({
                    value: appliedValue,
                    status: 'applied',
                    appliedAt: admin.firestore.Timestamp.now(),
                    invoiceId: invoiceRef.id
                  });
                  
                  // Cria um novo crédito com o valor restante
                  await partnersRef
                    .doc(partnerDoc.id)
                    .collection('credits')
                    .add({
                      orderId: creditData.orderId,
                      partnerId: creditData.partnerId,
                      storeId: creditData.storeId,
                      couponCode: creditData.couponCode,
                      couponIsGlobal: creditData.couponIsGlobal,
                      value: remainingValue,
                      status: 'pending',
                      createdAt: creditData.createdAt
                    });
                  
                  console.log(`✅ Crédito ${appliedCredit.couponCode} parcialmente aplicado (R$ ${appliedValue.toFixed(2)} de R$ ${originalValue.toFixed(2)})`);
                }
              }
            }
          }

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



// 🔒 CLOUD FUNCTION: Verificar Status de Bloqueio
exports.verificarStatusBloqueio = functions.https.onCall(async (data, context) => {
  try {
    // Verificar se o usuário está autenticado
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado');
    }

    const partnerId = context.auth.uid;
    console.log('🔒 VERIFICANDO STATUS DE BLOQUEIO via Cloud Function para:', partnerId);

    // Verifica o status de bloqueio
    const bloqueioInfo = await verificarEAplicarBloqueio(partnerId);
    
    // Se estiver bloqueado, força o fechamento do estabelecimento
    if (bloqueioInfo.isBlocked) {
      await forcarFechamentoSeNecessario(partnerId, bloqueioInfo);
    }

    return {
      success: true,
      ...bloqueioInfo,
      timestamp: admin.firestore.Timestamp.now()
    };

  } catch (error) {
    console.error('🔒 ❌ ERRO ao verificar status de bloqueio:', error);
    throw new functions.https.HttpsError('internal', `Erro ao verificar bloqueio: ${error.message}`);
  }
});

// 🔒 CLOUD FUNCTION: Verificar Permissão para Abrir Estabelecimento
exports.verificarPermissaoAbertura = functions.https.onCall(async (data, context) => {
  try {
    // Verificar se o usuário está autenticado
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado');
    }

    const partnerId = context.auth.uid;
    console.log('🔒 VERIFICANDO PERMISSÃO DE ABERTURA para:', partnerId);

    // Verifica o status de bloqueio
    const bloqueioInfo = await verificarEAplicarBloqueio(partnerId);
    
    if (bloqueioInfo.isBlocked) {
      console.log('🔒 ❌ ABERTURA NEGADA - parceiro bloqueado');
      
      // Força fechamento se necessário
      await forcarFechamentoSeNecessario(partnerId, bloqueioInfo);
      
      return {
        success: false,
        canOpen: false,
        isBlocked: true,
        reason: bloqueioInfo.blockingReason,
        daysPastDue: bloqueioInfo.daysPastDue,
        message: 'Estabelecimento não pode ser aberto devido a fatura vencida'
      };
    }

    console.log('🔒 ✅ ABERTURA PERMITIDA - parceiro em dia');
    return {
      success: true,
      canOpen: true,
      isBlocked: false,
      message: 'Estabelecimento pode ser aberto normalmente'
    };

  } catch (error) {
    console.error('🔒 ❌ ERRO ao verificar permissão de abertura:', error);
    throw new functions.https.HttpsError('internal', `Erro ao verificar permissão: ${error.message}`);
  }
});

// 🔒 CLOUD FUNCTION: Atualizar Status do Estabelecimento (com verificação de bloqueio)
exports.atualizarStatusEstabelecimento = functions.https.onCall(async (data, context) => {
  try {
    // Verificar se o usuário está autenticado
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado');
    }

    const partnerId = context.auth.uid;
    const { isOpen, reason } = data;

    console.log('🔒 ATUALIZANDO STATUS DO ESTABELECIMENTO:', { partnerId, isOpen, reason });

    // Se está tentando abrir, verifica se pode
    if (isOpen) {
      const bloqueioInfo = await verificarEAplicarBloqueio(partnerId);
      
      if (bloqueioInfo.isBlocked) {
        console.log('🔒 ❌ ABERTURA NEGADA - parceiro bloqueado');
        
        // Força fechamento
        await forcarFechamentoSeNecessario(partnerId, bloqueioInfo);
        
        throw new functions.https.HttpsError(
          'permission-denied', 
          `Não é possível abrir o estabelecimento: ${bloqueioInfo.blockingReason}`
        );
      }
    }

    // Atualiza o status do estabelecimento
    const partnerRef = db.collection('partners').doc(partnerId);
    const updateData = {
      isOpen: isOpen,
      lastStatusChange: admin.firestore.Timestamp.now(),
      statusChangeReason: reason || (isOpen ? 'Aberto pelo usuário' : 'Fechado pelo usuário'),
      operationMode: 'manual',
      updatedAt: admin.firestore.Timestamp.now(),
      // Remove completamente a estrutura aninhada antiga
      establishmentStatus: admin.firestore.FieldValue.delete()
    };

    // Se estiver abrindo, limpa campos de inatividade e bloqueio
    if (isOpen) {
      updateData.closedDueToInactivity = false;
      updateData.inactivityMessage = admin.firestore.FieldValue.delete();
      updateData.blockedSince = admin.firestore.FieldValue.delete();
      updateData.blockingReason = admin.firestore.FieldValue.delete();
    }

    await partnerRef.update(updateData);

    console.log('🔒 ✅ Status do estabelecimento atualizado:', isOpen ? 'ABERTO' : 'FECHADO');

    return {
      success: true,
      isOpen,
      message: `Estabelecimento ${isOpen ? 'aberto' : 'fechado'} com sucesso`,
      timestamp: admin.firestore.Timestamp.now()
    };

  } catch (error) {
    console.error('🔒 ❌ ERRO ao atualizar status do estabelecimento:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', `Erro ao atualizar status: ${error.message}`);
  }
});

// 🔒 TRIGGER: Verificação automática de bloqueio quando fatura é atualizada
exports.verificarBloqueioAoAtualizarFatura = functions.firestore
  .document('partners/{partnerId}/invoices/{invoiceId}')
  .onUpdate(async (change, context) => {
    try {
      const partnerId = context.params.partnerId;
      const before = change.before.data();
      const after = change.after.data();

      console.log('🔒 TRIGGER ATIVADO - Fatura atualizada:', {
        partnerId,
        invoiceId: context.params.invoiceId,
        statusBefore: before.status,
        statusAfter: after.status
      });

      // Se o status mudou para 'paid', DESBLOQUEIO INSTANTÂNEO
      if (before.status !== 'paid' && after.status === 'paid') {
        console.log('🎉 FATURA PAGA DETECTADA - INICIANDO DESBLOQUEIO INSTANTÂNEO:', partnerId);
        
        const bloqueioInfo = await verificarEAplicarBloqueio(partnerId);
        
        if (!bloqueioInfo.isBlocked) {
          console.log('🎉 ✅ DESBLOQUEIO INSTANTÂNEO - Todas as faturas estão em dia!');
          
          // Remove o bloqueio do estabelecimento IMEDIATAMENTE
          const partnerRef = db.collection('partners').doc(partnerId);
          await partnerRef.update({
            'establishmentStatus.operationMode': 'manual',
            'establishmentStatus.blockedSince': admin.firestore.FieldValue.delete(),
            'establishmentStatus.blockingReason': admin.firestore.FieldValue.delete(),
            'establishmentStatus.statusChangeReason': 'Desbloqueado automaticamente - fatura paga',
            'establishmentStatus.lastStatusChange': admin.firestore.Timestamp.now(),
            'establishmentStatus.unblocked': true, // Flag para indicar desbloqueio
            'establishmentStatus.unblockedAt': admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now()
          });
          
          console.log('🎉 ✅ DESBLOQUEIO CONCLUÍDO - Estabelecimento liberado para operação!');
        } else {
          console.log('⚠️ Ainda há outras faturas vencidas - mantendo bloqueio');
        }
      }
      
      // Se uma fatura venceu, verifica se precisa bloquear
      if (before.status === 'pending' && after.status === 'overdue') {
        console.log('🔒 FATURA VENCIDA DETECTADA - verificando se precisa bloquear parceiro:', partnerId);
        
        const bloqueioInfo = await verificarEAplicarBloqueio(partnerId);
        
        if (bloqueioInfo.isBlocked) {
          console.log('🔒 APLICANDO BLOQUEIO - Fatura vencida há mais de 7 dias');
          await forcarFechamentoSeNecessario(partnerId, bloqueioInfo);
        }
      }

      // Se o paymentInfo.status mudou para 'paid', também desbloqueia
      if (before.paymentInfo?.status !== 'paid' && after.paymentInfo?.status === 'paid') {
        console.log('🎉 PAGAMENTO CONFIRMADO VIA paymentInfo - INICIANDO DESBLOQUEIO:', partnerId);
        
        // Atualiza o status da fatura para 'paid' se ainda não estiver
        if (after.status !== 'paid') {
          const invoiceRef = change.after.ref;
          await invoiceRef.update({
            status: 'paid',
            paidAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now()
          });
          console.log('🎉 Status da fatura atualizado para PAID');
        }
        
        // Verifica e remove bloqueio
        const bloqueioInfo = await verificarEAplicarBloqueio(partnerId);
        
        if (!bloqueioInfo.isBlocked) {
          console.log('🎉 ✅ DESBLOQUEIO INSTANTÂNEO VIA PAGAMENTO CONFIRMADO!');
          
          const partnerRef = db.collection('partners').doc(partnerId);
          await partnerRef.update({
            'establishmentStatus.operationMode': 'manual',
            'establishmentStatus.blockedSince': admin.firestore.FieldValue.delete(),
            'establishmentStatus.blockingReason': admin.firestore.FieldValue.delete(),
            'establishmentStatus.statusChangeReason': 'Desbloqueado automaticamente - pagamento confirmado',
            'establishmentStatus.lastStatusChange': admin.firestore.Timestamp.now(),
            'establishmentStatus.unblocked': true,
            'establishmentStatus.unblockedAt': admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now()
          });
        }
      }

    } catch (error) {
      console.error('🔒 ❌ ERRO no trigger de verificação de bloqueio:', error);
    }
  }); 