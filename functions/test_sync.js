// Não inicializar o Firebase aqui pois já está inicializado no index.js

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
    console.log('Detalhes do erro:', error.message);
    process.exit(1);
  }); 