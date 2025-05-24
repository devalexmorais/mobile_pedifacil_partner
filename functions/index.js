const functions = require('firebase-functions');
const admin = require('firebase-admin');
let serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
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

// Função agendada para gerar faturas automaticamente (executa todo dia à meia-noite)
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
          .orderBy('createdAt', 'asc')
          .limit(1)
          .get();

        // Se não houver compras, pula este parceiro
        if (firstFeeQuery.empty) {
          console.log(`Nenhuma compra encontrada para o parceiro ${partnerDoc.id}`);
          continue;
        }

        const firstFee = firstFeeQuery.docs[0].data();
        const firstFeeDate = firstFee.createdAt;

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

        // Busca taxas não liquidadas e sem fatura desde a data de referência
        const nonSettledFeesQuery = await partnersRef
          .doc(partnerDoc.id)
          .collection('app_fees')
          .where('settled', '==', false)
          .where('invoiceId', '==', null)
          .where('createdAt', '>=', referenceDate)
          .get();

        console.log(`Total de taxas não liquidadas sem fatura para ${partnerDoc.id}: ${nonSettledFeesQuery.size}`);

        if (nonSettledFeesQuery.empty) {
          console.log(`Nenhuma taxa não liquidada sem fatura encontrada para o parceiro ${partnerDoc.id}`);
          continue;
        }

        // Se encontrou taxas não liquidadas, vamos processá-las
        let totalFeeAmount = 0;
        const simplifiedDetails = [];

        nonSettledFeesQuery.forEach(feeDoc => {
          const fee = feeDoc.data();
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
          const updatePromises = nonSettledFeesQuery.docs.map(feeDoc => {
            console.log(`Marcando taxa ${feeDoc.id} como liquidada`);
            return partnersRef
              .doc(partnerDoc.id)
              .collection('app_fees')
              .doc(feeDoc.id)
              .update({
                settled: true,
                invoiceId: invoiceRef.id,
                updatedAt: today
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