# Sistema de Créditos - PediFácil Partner

## Visão Geral

O sistema de créditos permite que estabelecimentos acumulem créditos através de cupons globais e os utilizem para descontar valores das faturas mensais. Os créditos são aplicados automaticamente durante a geração de faturas.

## Funcionalidades Implementadas

### 1. Acúmulo de Créditos
- **Cupons Globais**: Quando um cupom com `couponIsGlobal: true` é usado, um crédito é criado automaticamente
- **Valor do Crédito**: Corresponde ao valor que a plataforma cobriu (desconto aplicado)
- **Status**: Inicialmente `pending`, muda para `applied` quando usado

### 2. Aplicação Automática de Créditos
- **Geração de Faturas**: Durante a geração mensal de faturas, os créditos são aplicados automaticamente
- **Ordem de Aplicação**: Créditos mais antigos são aplicados primeiro (FIFO)
- **Aplicação Parcial**: Se um crédito não for totalmente usado, o restante permanece disponível
- **Valor Final**: O valor da fatura é reduzido pelos créditos aplicados

### 3. Interface do Usuário
- **Tela Financeiro**: Mostra resumo dos créditos disponíveis, total acumulado e utilizados
- **Tela Faturas**: Exibe créditos aplicados em cada fatura
- **Hook useCredits**: Gerencia o estado dos créditos no frontend

## Estrutura de Dados

### Coleção: `partners/{partnerId}/credits`
```typescript
interface Credit {
  id?: string;
  orderId: string;           // ID do pedido que gerou o crédito
  partnerId: string;         // ID do parceiro
  storeId: string;           // ID da loja
  couponCode: string;        // Código do cupom usado
  couponIsGlobal: boolean;   // Se o cupom é global
  value: number;             // Valor do crédito
  status: 'pending' | 'applied' | 'expired';
  createdAt: Timestamp;      // Data de criação
  appliedAt?: Timestamp;     // Data de aplicação
  invoiceId?: string;        // ID da fatura onde foi aplicado
}
```

### Fatura Atualizada
```typescript
interface Invoice {
  // ... campos existentes
  originalAmount?: number;           // Valor original antes dos créditos
  appliedCreditsAmount?: number;     // Total de créditos aplicados
  appliedCredits?: Array<{           // Detalhes dos créditos aplicados
    creditId: string;
    couponCode: string;
    originalValue: number;
    appliedValue: number;
  }>;
}
```

## Fluxo de Funcionamento

### 1. Criação de Crédito
```javascript
// Quando um pedido com cupom global é entregue
if (pedidoData.hasCoupon && pedidoData.couponApplied?.isGlobal === true) {
  const creditData = {
    orderId: pedidoId,
    partnerId: user.uid,
    storeId: pedidoData.storeId,
    couponCode: pedidoData.couponCode,
    couponIsGlobal: true,
    value: Number(pedidoData.couponApplied.discountValue || 0),
    status: 'pending',
    createdAt: now
  };
  
  await addDoc(creditsRef, creditData);
}
```

### 2. Aplicação de Créditos na Fatura
```javascript
// Durante a geração de faturas
const availableCredits = await getAvailableCredits(partnerId);
let finalAmount = totalFeeAmount;
let appliedCredits = [];

for (const credit of availableCredits) {
  if (finalAmount <= 0) break;
  
  const creditToApply = Math.min(credit.value, finalAmount);
  appliedCredits.push({
    creditId: credit.id,
    couponCode: credit.couponCode,
    originalValue: credit.value,
    appliedValue: creditToApply
  });
  
  finalAmount -= creditToApply;
}

// Se o valor final for 0, não cria fatura
if (finalAmount <= 0) {
  console.log('Fatura totalmente coberta por créditos!');
  return;
}
```

## Arquivos Modificados

### 1. `src/services/creditService.ts` (NOVO)
- Serviço completo para gerenciar créditos
- Funções para buscar, aplicar e atualizar créditos
- Cálculo de resumo de créditos

### 2. `functions/index.js`
- Modificada função `generateInvoicesScheduled`
- Adicionada busca de créditos disponíveis
- Implementada aplicação automática de créditos
- Atualização de status dos créditos aplicados

### 3. `src/services/appFeeService.ts`
- Atualizada interface `Invoice` para incluir campos de créditos

### 4. `src/app/(auth)/drawer/financeiro.tsx`
- Adicionada seção de créditos disponíveis
- Exibição de resumo de créditos
- Lista de créditos pendentes

### 5. `src/app/(auth)/drawer/faturas.tsx`
- Exibição de créditos aplicados na fatura
- Mostra valor original vs valor final
- Estilos para seção de créditos

### 6. `src/hooks/useCredits.ts` (NOVO)
- Hook para gerenciar estado dos créditos
- Carregamento automático e refresh

## Regras de Negócio

### 1. Aplicação de Créditos
- **Ordem**: Créditos mais antigos são aplicados primeiro
- **Parcial**: Se um crédito não for totalmente usado, o restante permanece disponível
- **Automática**: Aplicação acontece durante a geração de faturas

### 2. Validações
- Apenas créditos com status `pending` são aplicados
- Créditos aplicados mudam para status `applied`
- Se a fatura for totalmente coberta, não é criada

### 3. Interface
- Créditos disponíveis são mostrados em verde
- Valor original vs final é claramente exibido
- Lista de créditos pendentes com códigos dos cupons

## Exemplo de Uso

### Cenário: Estabelecimento com Créditos
1. **Pedido com Cupom Global**: Cliente usa cupom "BEMVINDO10" (R$ 3,40)
2. **Crédito Criado**: Sistema cria crédito de R$ 3,40 para o estabelecimento
3. **Geração de Fatura**: Fatura de R$ 50,00 é gerada
4. **Aplicação Automática**: Crédito de R$ 3,40 é aplicado
5. **Valor Final**: Fatura fica com R$ 46,60
6. **Interface**: Usuário vê "Créditos aplicados: R$ 3,40" na fatura

### Benefícios
- **Redução de Custos**: Estabelecimentos podem reduzir taxas com créditos
- **Transparência**: Interface clara mostra créditos disponíveis e aplicados
- **Automatização**: Processo totalmente automático
- **Flexibilidade**: Aplicação parcial de créditos

## Monitoramento

### Logs Importantes
- `💰 Créditos disponíveis encontrados: X`
- `💳 Crédito X: R$ Y aplicado`
- `✅ Total de créditos aplicados: R$ X`
- `💸 Valor final da fatura após créditos: R$ X`
- `🎉 Fatura totalmente coberta por créditos!`

### Métricas
- Total de créditos acumulados por parceiro
- Valor médio de créditos aplicados
- Taxa de utilização de créditos
- Impacto na receita da plataforma 