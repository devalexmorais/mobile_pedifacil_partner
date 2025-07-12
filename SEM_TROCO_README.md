# Funcionalidade "Sem Troco" - PediFacil Partner

## Descrição

Esta funcionalidade permite que os clientes informem que o pagamento em dinheiro será feito "sem troco", eliminando a necessidade de calcular e fornecer troco.

## Como Funciona

### Estrutura de Dados

Quando um pedido é criado com pagamento em dinheiro, o campo `changeFor` pode conter:

1. **Valor numérico**: Quando o cliente informa um valor específico para troco
   ```json
   {
     "payment": {
       "method": "money",
       "changeFor": "50.00"
     }
   }
   ```

2. **String "sem_troco"**: Quando o cliente informa que não precisa de troco
   ```json
   {
     "payment": {
       "method": "money",
       "changeFor": "sem_troco"
     }
   }
   ```

### Exibição nos Diferentes Status

#### 1. Pedidos Pendentes (`pedidos.tsx`)
- Mostra: "DINHEIRO - Sem troco" ou "DINHEIRO - Troco para R$ X.XX"

#### 2. Pedidos Prontos (`pronto.tsx`)
- Mostra: "Pagamento: Sem troco" com ícone de X
- Ou mostra: "Pago com: R$ X.XX" e "Troco: R$ Y.YY"

#### 3. Pedidos em Entrega (`em-entrega.tsx`)
- Mostra: "DINHEIRO - Sem troco" ou "DINHEIRO - Troco para R$ X.XX"

#### 4. Modal de Detalhes (`OrderDetailsModal.tsx`)
- Mostra: "DINHEIRO - Sem troco" ou "DINHEIRO - Troco para R$ X.XX"

## Implementação Técnica

### Arquivos Modificados

1. **`src/app/(auth)/(tabs)/pronto.tsx`**
   - Função `calcularTroco()` atualizada para detectar "sem_troco"
   - Exibição condicional baseada no valor de `changeFor`

2. **`src/app/(auth)/(tabs)/pedidos.tsx`**
   - Exibição de pagamento atualizada para mostrar "Sem troco"

3. **`src/app/(auth)/(tabs)/em-entrega.tsx`**
   - Adicionada seção de informações de pagamento

4. **`src/components/OrderDetailsModal.tsx`**
   - Adicionada informação de pagamento no resumo do pedido

### Lógica de Detecção

```typescript
// Verifica se é "sem troco"
if (item.payment.changeFor === 'sem_troco') {
  return 'sem_troco';
}

// Caso contrário, calcula o troco normalmente
const valorPagamento = parseFloat(item.payment.changeFor);
const trocoValue = valorPagamento - item.finalPrice;
return trocoValue > 0 ? trocoValue.toFixed(2) : '0.00';
```

## Benefícios

1. **Facilita o processo de pagamento** para clientes que não precisam de troco
2. **Reduz erros** de cálculo de troco
3. **Melhora a experiência** do estabelecimento ao preparar o pedido
4. **Clareza visual** com ícones e textos específicos para cada situação

## Compatibilidade

- ✅ Funciona com todos os status de pedido (pendente, preparando, pronto, em entrega)
- ✅ Compatível com a estrutura de dados existente
- ✅ Não quebra funcionalidades existentes
- ✅ Mantém compatibilidade com pedidos antigos

## Notas Importantes

- A funcionalidade é implementada apenas no lado do parceiro (estabelecimento)
- O cliente deve informar "sem troco" no momento da criação do pedido
- Não há validação no backend - depende da informação enviada pelo cliente
- A exibição é consistente em todas as telas do aplicativo 