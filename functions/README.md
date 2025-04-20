# Cloud Functions - PediFacil Partners

Este diretório contém as Cloud Functions utilizadas pelo aplicativo de parceiros do PediFacil.

## Funções Disponíveis

### `sendNotificationOnCreate`

Detecta automaticamente quando uma nova notificação é criada na coleção `partners/{partnerId}/notifications/{notificationId}` e envia uma notificação push (FCM) para o dispositivo do parceiro.

#### Como funciona:
1. A função é acionada sempre que um novo documento é criado na coleção de notificações
2. Busca o token FCM do parceiro
3. Envia a notificação push para o dispositivo
4. Atualiza o documento da notificação com status de envio

#### Formato da notificação:
```javascript
{
  title: "Título da notificação",
  body: "Corpo da notificação",
  type: "tipo da notificação", // Por exemplo: "pedido", "geral", etc.
  screen: "tela para navegação", // Para direcionar o usuário para a tela apropriada
  read: false,
  createdAt: Timestamp
}
```

### `createTestNotification`

Função HTTP para criar notificações de teste, útil para desenvolvimento e testes do sistema de notificações.

#### Como usar no código:
```typescript
// Importe a função no seu código
import { getFunctions, httpsCallable } from 'firebase/functions';

// Use a função para criar uma notificação de teste
const functionsInstance = getFunctions();
const createTestNotification = httpsCallable(functionsInstance, 'createTestNotification');

// Chame a função
const result = await createTestNotification({
  partnerId: 'ID_DO_PARCEIRO', // Obrigatório
  title: 'Título da notificação',  // Opcional
  body: 'Corpo da notificação',    // Opcional
  type: 'tipo da notificação',    // Opcional
  screen: 'tela de destino'       // Opcional
});
```

## Implantação

Para implantar as Cloud Functions, execute os seguintes comandos:

```bash
# Certifique-se de estar na pasta functions
cd functions

# Instale as dependências (se necessário)
npm install

# Implante as funções
npm run deploy
```

> **Importante**: Você deve ter o Firebase CLI instalado e estar autenticado com uma conta que tenha permissões para implantar funções no projeto.

## FCM Tokens

Os tokens FCM são salvos no documento do parceiro de duas formas para garantir compatibilidade:

1. `fcmTokens.token` - Token do Firebase Messaging
2. `notificationTokens.expoToken` - Token do Expo Notifications

A função de envio de notificações verifica os dois formatos para garantir que a notificação seja entregue. 