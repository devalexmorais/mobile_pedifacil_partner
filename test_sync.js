const admin = require('firebase-admin');
const functions = require('firebase-functions-test')();

// Configurar o Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Simular autenticação
const context = {
  auth: {
    uid: 'test-user',
    token: { admin: true }
  }
};

// Dados para o teste
const data = {
  paymentId: '114070738541'
};

console.log('🧪 Testando sincronização forçada do pagamento:', data.paymentId);

// Importar e executar a função
const myFunctions = require('./index');

myFunctions.forceSyncPayment(data, context)
  .then(result => {
    console.log('✅ Resultado da sincronização:');
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro na sincronização:', error);
    process.exit(1);
  }); 