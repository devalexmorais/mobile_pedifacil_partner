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
exports.onUserCreated = functions.auth.user().onCreate((user) => {
  // Define a role padrão como 'partner' para novos usuários
  const defaultClaims = { role: 'partner' };
  
  return admin.auth().setCustomUserClaims(user.uid, defaultClaims)
    .then(() => {
      console.log(`Role padrão definida para o usuário ${user.uid}`);
      return null;
    })
    .catch((error) => {
      console.error('Erro ao definir role padrão:', error);
      return null;
    });
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