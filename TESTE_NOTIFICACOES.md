# Teste do Sistema de Notificações

## 🧪 Como Testar

### 1. Teste Manual (Recomendado)

#### Passo 1: Verificar se as regras estão corretas
```bash
# Implantar as regras do Firestore
firebase deploy --only firestore:rules
```

#### Passo 2: Testar em uma tela de pedidos
1. Abra o app como parceiro
2. Vá para a tela de pedidos
3. Aceite um pedido
4. Verifique no console se aparece:
   ```
   🚀 Enviando notificação de status para usuário: [userId], pedido: [orderId], status: preparing
   🚀 Iniciando envio de notificação para usuário: [userId]
   📝 Salvando notificação no Firestore...
   ✅ Notificação salva com sucesso! ID: [notificationId]
   📱 Notificação push local enviada com sucesso
   ✅ Notificação de status enviada com sucesso! ID: [notificationId]
   ```

#### Passo 3: Verificar no Firestore
1. Vá para o Firebase Console
2. Navegue para Firestore
3. Vá para `users/[userId]/notifications`
4. Deve aparecer uma nova notificação com:
   - title: "Pedido Aceito"
   - body: "Seu pedido #[4 dígitos] foi aceito e está sendo preparado!"
   - data: { orderId, status: "preparing", type: "order_status" }

### 2. Teste Automático (Opcional)

#### Adicionar botão de teste temporário
```typescript
// Adicionar em qualquer tela para teste
import { notificationService } from '@/services/notificationService';

// Botão de teste
<TouchableOpacity 
  onPress={async () => {
    try {
      await notificationService.testNotification('USER_ID_AQUI');
      Alert.alert('Sucesso', 'Notificação de teste enviada!');
    } catch (error) {
      Alert.alert('Erro', 'Falha no teste: ' + error.message);
    }
  }}
>
  <Text>🧪 Testar Notificação</Text>
</TouchableOpacity>
```

### 3. Verificar Logs

#### Firebase Functions (se estiver usando)
```bash
firebase functions:log --only sendOrderStatusNotification
```

#### App Console
- Procure por logs com emojis: 🚀, ✅, ❌, 📝, 📱

### 4. Testar Todos os Status

1. **Aceitar pedido** → Status: `preparing` → "Pedido Aceito"
2. **Marcar como pronto** → Status: `ready` → "Pedido Pronto"
3. **Enviar para entrega** → Status: `out_for_delivery` → "Pedido em Entrega"
4. **Confirmar entrega** → Status: `delivered` → "Pedido Entregue"
5. **Cancelar pedido** → Status: `cancelled` → "Pedido Cancelado"

## 🔍 O que Verificar

### ✅ Sucesso
- [ ] Logs aparecem no console
- [ ] Notificação salva no Firestore
- [ ] Notificação push local enviada
- [ ] Documento criado em `users/{userId}/notifications`

### ❌ Problemas Comuns

#### 1. Erro de Permissão
```
❌ Erro ao enviar notificação: FirebaseError: Missing or insufficient permissions
```
**Solução**: Verificar se as regras do Firestore foram implantadas corretamente

#### 2. Usuário não encontrado
```
❌ Usuário não encontrado: [userId]
```
**Solução**: Verificar se o userId está correto no pedido

#### 3. Notificação não aparece
```
✅ Notificação salva com sucesso! ID: [id]
```
Mas não aparece no app do usuário
**Solução**: Verificar se o app do usuário está configurado para receber notificações

## 📱 Teste no App do Usuário

1. Abra o app como usuário
2. Faça um pedido
3. No app do parceiro, mude o status do pedido
4. Verifique se o usuário recebe a notificação

## 🚨 Troubleshooting

### Se as notificações não funcionarem:

1. **Verificar regras do Firestore**:
   ```bash
   firebase deploy --only firestore:rules
   ```

2. **Verificar se o userId está correto**:
   - Abrir console do app
   - Verificar se o userId nos logs está correto

3. **Verificar se a coleção existe**:
   - Firebase Console → Firestore
   - Verificar se existe `users/{userId}/notifications`

4. **Testar função manualmente**:
   ```typescript
   await notificationService.testNotification('USER_ID_REAL');
   ```

## 📊 Logs Esperados

### Sucesso:
```
🚀 Enviando notificação de status para usuário: abc123, pedido: order456, status: preparing
🚀 Iniciando envio de notificação para usuário: abc123
📋 Dados da notificação: { title: "Pedido Aceito", body: "..." }
📝 Salvando notificação no Firestore...
✅ Notificação salva com sucesso! ID: notification789
📱 Notificação push local enviada com sucesso
✅ Notificação de status enviada com sucesso! ID: notification789
```

### Erro:
```
❌ Erro ao enviar notificação: FirebaseError: Missing or insufficient permissions
🔍 Detalhes do erro: { userId: "abc123", errorMessage: "Missing or insufficient permissions" }
```

---

**Status**: ✅ **SISTEMA PRONTO PARA TESTE** 