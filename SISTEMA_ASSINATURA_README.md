# Sistema de Assinatura Mensal - PediFácil Partner

Este documento explica o sistema de assinatura mensal implementado usando a API do Mercado Pago para o aplicativo PediFácil Partner.

## 📋 Visão Geral

O sistema permite que os parceiros criem assinaturas automáticas para o plano Premium, salvem cartões de crédito de forma segura e tenham cobrança automática mensal.

## 🏗️ Arquitetura

### Componentes Principais

1. **MercadoPagoService** (`src/services/mercadoPagoService.ts`)
   - Gerencia todas as interações com a API do Mercado Pago
   - Funções para customers, cartões e assinaturas

2. **SubscriptionService** (`src/services/subscriptionService.ts`)
   - Lógica de negócio para assinaturas
   - Integração com Firestore para persistência

3. **CardTokenizationService** (`src/services/cardTokenizationService.ts`)
   - Tokenização segura de cartões
   - Validação e formatação de dados

4. **Tela de Assinatura** (`src/app/(auth)/drawer/signature.tsx`)
   - Interface do usuário para gerenciar assinaturas
   - Formulários para adicionar cartões

## 🔧 Funcionalidades Implementadas

### ✅ Já Funcionando

- **Estrutura de serviços completa**
- **Interface de usuário completa**
- **Validação de dados de cartão**
- **Formatação automática de campos**
- **Integração com Firestore**
- **Modais para gerenciar cartões**
- **Sistema de cancelamento de assinatura**

### ⚠️ Necessita Configuração Adicional

- **Tokenização real de cartões** (requer SDK frontend do Mercado Pago)
- **Webhook para pagamentos recorrentes**
- **Testing com cartões reais**

## 📱 Como Usar

### Para o Usuário Final

1. **Acessar Assinatura**
   - Ir para "Minha Assinatura" no menu lateral
   - Ver status atual (Básico/Premium)

2. **Assinar Premium**
   - Clicar em "Adicionar Cartão e Assinar" ou "Assinar com Cartão Salvo"
   - Preencher dados do cartão (formatação automática)
   - Confirmar assinatura

3. **Gerenciar Assinatura**
   - Ver cartões salvos
   - Cancelar assinatura quando quiser
   - Continuar usando até o final do período pago

## 🔐 Segurança

### Tokenização de Cartões

```typescript
// Os dados do cartão nunca são salvos diretamente
const cardData = cardTokenizationService.prepareCardData(formData);
const tokenResponse = await cardTokenizationService.createCardToken(cardData);
```

### Validação

- Validação de número de cartão
- Verificação de data de validade
- Validação de CVV
- Verificação de CPF (opcional)

## 🔄 Fluxo de Assinatura

1. **Customer Creation**
   ```typescript
   const customerId = await subscriptionService.getOrCreateCustomer(partnerId, customerData);
   ```

2. **Card Tokenization**
   ```typescript
   const token = await cardTokenizationService.createCardToken(cardData);
   ```

3. **Card Saving**
   ```typescript
   await subscriptionService.saveCard(partnerId, token);
   ```

4. **Subscription Creation**
   ```typescript
   await subscriptionService.createSubscription(partnerId, planId, cardId);
   ```

## 📊 Estrutura de Dados

### Customer (Mercado Pago)
```typescript
interface CustomerData {
  email: string;
  first_name: string;
  last_name: string;
  phone?: { area_code: string; number: string };
  identification?: { type: string; number: string };
}
```

### Subscription (Firestore)
```typescript
interface Subscription {
  id: string;
  partnerId: string;
  planId: string;
  mercadoPagoCustomerId: string;
  mercadoPagoSubscriptionId: string;
  cardId: string;
  status: 'active' | 'cancelled' | 'paused' | 'expired' | 'failed';
  amount: number;
  currency: string;
  frequency: number;
  frequency_type: 'months' | 'days';
  next_payment_date: string;
  // ... outros campos
}
```

## 🔌 Integração Necessária

### 1. SDK do Mercado Pago (Frontend)

Para implementação completa, você precisa adicionar o SDK do Mercado Pago no frontend:

```bash
npm install @mercadopago/sdk-react
```

```typescript
// Exemplo de uso real
import { CardPayment } from '@mercadopago/sdk-react';

const onSubmit = async (param) => {
  const token = await createCardToken(param);
  // Usar o token para salvar o cartão
};
```

### 2. Webhook Configuration

Configure um webhook para receber notificações de pagamento:

```typescript
// Em functions/src/mercadopago.ts
export const subscriptionWebhook = functions.https.onRequest(async (req, res) => {
  const paymentData = req.body;
  await subscriptionService.processSubscriptionPayment(paymentData);
  res.status(200).send('OK');
});
```

### 3. Configuração de Ambiente

```typescript
// src/config/mercadoPago.ts
export const MERCADO_PAGO_CONFIG = {
  PUBLIC_KEY: process.env.EXPO_PUBLIC_MERCADO_PAGO_PUBLIC_KEY,
  ACCESS_TOKEN: process.env.MERCADO_PAGO_ACCESS_TOKEN
};
```

## 🧪 Testes

### Cartões de Teste do Mercado Pago

```
Visa: 4509 9535 6623 3704
Mastercard: 5031 7557 3453 0604
CVV: 123
Validade: 11/25
Nome: APRO (aprovado) / CONT (pendente) / OTHE (recusado)
```

## 📋 Próximos Passos

### Implementação Completa

1. **Configurar SDK do Mercado Pago**
   - Instalar dependências necessárias
   - Configurar tokenização segura

2. **Configurar Webhooks**
   - Endpoint para notificações de pagamento
   - Processamento de status de assinatura

3. **Testes**
   - Testar com cartões de teste
   - Validar fluxo completo de assinatura

4. **Deploy**
   - Configurar variáveis de ambiente
   - Deploy das functions

### Melhorias Futuras

- **Múltiplos planos** (mensal, anual)
- **Cupons de desconto** para assinaturas
- **Relatórios de faturamento**
- **Notificações push** para falhas de pagamento

## 🆘 Solução de Problemas

### Erro: "Cliente já existe"
- O serviço verifica automaticamente se o customer já existe
- Se necessário, use `getCustomerByEmail()` antes de criar

### Erro: "Cartão inválido"
- Verifique se os dados estão formatados corretamente
- Use as funções de validação antes de enviar

### Erro: "Assinatura não encontrada"
- Verifique se o partner tem uma assinatura ativa
- Use `getActiveSubscription()` para verificar

## 📞 Suporte

Este sistema foi desenvolvido para integrar com a API do Mercado Pago de forma segura e eficiente. Para questões específicas da API, consulte a [documentação oficial do Mercado Pago](https://www.mercadopago.com.br/developers).

---

**Desenvolvido para PediFácil Partner App**
*Sistema de assinatura automática com Mercado Pago* 