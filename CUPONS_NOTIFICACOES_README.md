# Sistema de Notificações de Cupons

## Visão Geral

Este sistema permite que quando um cupom for criado ou ativado por um parceiro, uma notificação seja enviada automaticamente para todos os usuários da plataforma.

## Funcionalidades Implementadas

### 1. Notificação ao Criar Cupom
- Quando um parceiro cria um novo cupom ativo
- Notificação enviada para todos os usuários da coleção `users`
- Inclui informações do cupom: código, tipo de desconto, valor

### 2. Notificação ao Ativar Cupom
- Quando um parceiro ativa um cupom previamente inativo
- Notificação enviada para todos os usuários
- Inclui as mesmas informações do cupom

### 3. Otimizações de Performance
- Limitação de 100 usuários por notificação (para evitar sobrecarga)
- Processamento em lotes de 10 usuários
- Pausa de 100ms entre lotes
- Tratamento de erros individual por usuário

## Estrutura das Notificações

### Dados Enviados
```typescript
{
  id: string;
  title: string; // "🎉 Novo Cupom Disponível!"
  body: string; // Descrição detalhada do cupom
  createdAt: Date;
  read: boolean;
  data: {
    type: 'coupon';
    action: 'created' | 'activated';
    couponCode: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    storeId: string;
    storeName?: string;
  }
}
```

### Exemplo de Mensagem
- **Título**: "🎉 Novo Cupom Disponível!"
- **Corpo**: "Dindin Delicia criou um novo cupom: PEDIFACIL10 - 15% de desconto"

**Nota**: Tanto para criação quanto para ativação de cupons, a mesma mensagem é utilizada para manter consistência na experiência do usuário.

## Arquivos Modificados

### 1. `src/services/couponService.ts`
- Adicionada função `getAllUsers()` para buscar usuários
- Adicionada função `sendCouponNotificationToUsers()` para enviar notificações
- Adicionada função `getStoreName()` para buscar nome do estabelecimento
- Modificada função `createCoupon()` para enviar notificação ao criar
- Modificada função `toggleCouponActive()` para enviar notificação ao ativar

### 2. `src/app/(auth)/drawer/coupons.tsx`
- Adicionadas mensagens de sucesso ao criar/ativar cupons
- Feedback visual para o usuário sobre o envio de notificações

## Correções Implementadas

### Nome da Loja nas Notificações
- **Problema**: As notificações estavam usando o nome da pessoa (`data.name`) em vez do nome da loja
- **Solução**: Modificada a função `getStoreName()` para buscar o nome correto da loja em `data.store.name`
- **Resultado**: Agora as notificações mostram "Dindin Delicia criou um novo cupom" em vez de "Acilene criou um novo cupom"

## Fluxo de Funcionamento

1. **Criação de Cupom**:
   - Parceiro cria cupom no app
   - Sistema salva cupom no Firestore
   - Sistema busca todos os usuários
   - Sistema envia notificação para cada usuário
   - Sistema mostra mensagem de sucesso

2. **Ativação de Cupom**:
   - Parceiro ativa cupom inativo
   - Sistema atualiza status no Firestore
   - Sistema busca dados do cupom
   - Sistema envia notificação para todos os usuários
   - Sistema mostra mensagem de sucesso

## Logs e Monitoramento

O sistema inclui logs detalhados para monitoramento:
- Número de usuários encontrados
- Progresso do envio em lotes
- Erros individuais por usuário
- Confirmação de sucesso

## Considerações de Performance

- **Limite de usuários**: 100 por notificação
- **Tamanho do lote**: 10 usuários por vez
- **Pausa entre lotes**: 100ms
- **Tratamento de erros**: Continua mesmo se alguns usuários falharem

## Próximas Melhorias Sugeridas

1. **Cloud Functions**: Implementar envio via Cloud Functions para melhor performance
2. **Segmentação**: Enviar apenas para usuários interessados no estabelecimento
3. **Agendamento**: Permitir agendar envio de notificações
4. **Analytics**: Rastrear taxa de abertura das notificações
5. **Personalização**: Permitir personalizar mensagens por estabelecimento

## Testes

Para testar a funcionalidade:
1. Criar um novo cupom ativo
2. Verificar logs no console
3. Verificar notificações na coleção `users/{userId}/notifications`
4. Ativar um cupom inativo
5. Verificar nova notificação enviada 