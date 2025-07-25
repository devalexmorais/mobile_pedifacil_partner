# Correção do Sistema de Notificações

## Problemas Identificados

### 1. Regras do Firestore Conflitantes
- A regra global `match /{document=**} { allow read: if true; }` estava interferindo com as regras específicas de notificações
- Falta de permissão específica para `users/{userId}/notifications/{notificationId}`
- Parceiros não conseguiam enviar notificações para usuários

### 2. Cloud Functions Incompletas
- Não havia Cloud Function para detectar mudanças de status de pedidos
- Notificações push não eram enviadas automaticamente para usuários

### 3. Serviço de Notificações com Logs Insuficientes
- Falta de logs de debug para identificar problemas
- Tratamento de erro inadequado

## Correções Implementadas

### 1. Regras do Firestore Corrigidas

#### ✅ Regra Específica para Notificações de Usuários
```javascript
// Regra específica para notificações de usuários - DEVE VIR ANTES DA REGRA GLOBAL
match /users/{userId}/notifications/{notificationId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated() || isCloudFunction();
  allow update, delete: if isOwner(userId);
}
```

#### ✅ Reorganização das Regras
- Movida a regra de notificações de usuários para **ANTES** da regra global
- Adicionadas funções auxiliares para verificar atualizações específicas
- Melhorada a estrutura geral das regras

### 2. Nova Função: `sendOrderStatusNotificationToUser`

#### ✅ Envio Direto como Cupom
```typescript
async sendOrderStatusNotificationToUser(userId: string, orderId: string, status: string, partnerId?: string)
```

#### ✅ Funcionalidades da Nova Função
- **Envio Direto**: Usa a mesma lógica dos cupons para enviar notificações
- **Usuário Específico**: Envia para o usuário que fez o pedido
- **Geração de Mensagens**: Cria mensagens específicas para cada status
- **Envio Duplo**: Envia tanto push quanto documento no Firestore
- **Logs Detalhados**: Registra todo o processo para debug

#### ✅ Status Suportados
- `preparing` → "Pedido Aceito"
- `ready` → "Pedido Pronto"
- `out_for_delivery` → "Pedido em Entrega"
- `delivered` → "Pedido Entregue"
- `cancelled` → "Pedido Cancelado"

### 3. Serviço de Notificações Melhorado

#### ✅ Logs de Debug Adicionados
```typescript
console.log(`🚀 Iniciando envio de notificação para usuário: ${userId}`);
console.log('📋 Dados da notificação:', data);
console.log('📝 Salvando notificação no Firestore...');
console.log(`✅ Notificação salva com sucesso! ID: ${docRef.id}`);
```

#### ✅ Tratamento de Erro Melhorado
```typescript
console.error('❌ Erro ao enviar notificação:', error);
console.error('🔍 Detalhes do erro:', {
  userId,
  data,
  errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
  errorCode: error instanceof Error ? (error as any).code : 'UNKNOWN'
});
```

#### ✅ Envio Duplo de Notificações
- Salva no Firestore (`users/{userId}/notifications`)
- Envia notificação push local (Expo Notifications)
- Continua funcionando mesmo se uma das opções falhar

## Como Funciona Agora

### 1. Fluxo de Notificações para Usuários
```
Parceiro muda status do pedido
    ↓
Função sendOrderStatusNotificationToUser é chamada
    ↓
Usa a mesma lógica dos cupons
    ↓
Salva na coleção users/{userId}/notifications
    ↓
Envia notificação push local
    ↓
Usuário recebe notificação
```

### 2. Fluxo de Notificações para Parceiros
```
Sistema cria notificação para parceiro
    ↓
Salva em partners/{partnerId}/notifications
    ↓
Cloud Function detecta novo documento
    ↓
Envia notificação push para parceiro
```

## Testes Recomendados

### 1. Teste de Notificações para Usuários
1. Aceitar um pedido (status: pending → preparing)
2. Marcar como pronto (status: preparing → ready)
3. Enviar para entrega (status: ready → out_for_delivery)
4. Confirmar entrega (status: out_for_delivery → delivered)

### 2. Teste de Notificações para Parceiros
1. Criar cupom (deve enviar notificação para parceiro)
2. Cancelar pedido por inatividade
3. Fechar estabelecimento por inatividade

### 3. Verificação de Logs
- Verificar logs do Firebase Functions
- Verificar logs do app (console.log)
- Verificar se tokens FCM estão sendo salvos

## Arquivos Modificados

1. **`firestore.rules`** - Regras corrigidas e reorganizadas
2. **`functions/index.js`** - Cloud Function removida (não é mais necessária)
3. **`src/services/notificationService.ts`** - Nova função sendOrderStatusNotificationToUser adicionada
4. **Telas de pedidos** - Agora usam a nova função que funciona como cupom

## Próximos Passos

1. **Implantar as regras do Firestore**:
   ```bash
   firebase deploy --only firestore:rules
   ```

2. **Remover Cloud Function desnecessária** (opcional):
   ```bash
   firebase functions:delete sendOrderStatusNotification
   ```

3. **Testar em ambiente de desenvolvimento**

4. **Monitorar logs** para identificar possíveis problemas

## Observações Importantes

- As notificações agora funcionam **exatamente como os cupons** - salvando na coleção `users/{userId}/notifications`
- **Usa a mesma função** `sendOrderNotification` que funciona para cupons
- O sistema é **mais confiável** porque usa uma abordagem já testada
- **Logs detalhados** facilitam a identificação de problemas
- **Funciona para o usuário específico** que fez o pedido 