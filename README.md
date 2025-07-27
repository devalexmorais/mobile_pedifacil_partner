# PediFácil Partner - App para Estabelecimentos

Aplicativo móvel para estabelecimentos parceiros do PediFácil, desenvolvido com React Native e Expo.

## 📱 Sobre o Projeto

O PediFácil Partner é um aplicativo completo para gerenciamento de pedidos, produtos, finanças e assinaturas para estabelecimentos parceiros da plataforma PediFácil.

## 🚀 Funcionalidades Principais

### 📋 Gestão de Pedidos
- **Status em Tempo Real**: Acompanhamento de pedidos (pendente, preparando, pronto, em entrega, entregue)
- **Notificações Automáticas**: Sistema de notificações push para mudanças de status
- **Interface Intuitiva**: Telas organizadas por status dos pedidos

### 🛍️ Catálogo de Produtos
- **Gestão Completa**: Adicionar, editar e remover produtos
- **Categorias**: Organização por categorias
- **Variações**: Produtos com múltiplas opções e tamanhos
- **Promoções**: Sistema de cupons e descontos

### 💰 Sistema Financeiro
- **Faturas Mensais**: Geração automática de faturas
- **Sistema de Créditos**: Acúmulo e aplicação automática de créditos via cupons globais
- **Relatórios**: Visualização de receitas e despesas
- **Taxas**: Controle de taxas da plataforma

### 💳 Sistema de Assinatura
- **Plano Premium**: Assinatura mensal com Mercado Pago
- **Cartões Salvos**: Armazenamento seguro de cartões
- **Cobrança Automática**: Renovação automática mensal
- **Cancelamento**: Facilidade para cancelar assinatura

### 🔔 Notificações
- **Push Notifications**: Notificações em tempo real
- **Status de Pedidos**: Atualizações automáticas
- **Sistema Robusto**: Integração com Expo Notifications

## 🛠️ Tecnologias Utilizadas

- **React Native** com **Expo**
- **Firebase** (Firestore, Functions, Auth)
- **Mercado Pago** (Pagamentos e Assinaturas)
- **TypeScript**
- **Expo Router** (Navegação)
- **React Hook Form** (Formulários)

## 📁 Estrutura do Projeto

```
src/
├── app/                    # Telas do app (Expo Router)
│   ├── (auth)/            # Telas autenticadas
│   │   ├── (tabs)/        # Abas principais (pedidos)
│   │   └── drawer/        # Menu lateral
├── components/            # Componentes reutilizáveis
├── services/             # Serviços e APIs
├── contexts/             # Contextos React
├── hooks/                # Hooks customizados
├── types/                # Definições TypeScript
└── utils/                # Utilitários
```

## 🔧 Configuração e Instalação

### Pré-requisitos
- Node.js 18+
- Expo CLI
- Conta Firebase
- Conta Mercado Pago

### Instalação

1. **Clone o repositório**
   ```bash
   git clone [url-do-repositorio]
   cd mobile_pedifacil_partner
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente**
   ```bash
   # Crie um arquivo .env com:
   EXPO_PUBLIC_FIREBASE_API_KEY=sua_chave
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_dominio
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=seu_projeto
   EXPO_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=sua_chave_publica
   ```

4. **Inicie o projeto**
   ```bash
   npx expo start
   ```

## 🔐 Autenticação e Segurança

- **Firebase Auth**: Autenticação segura
- **Firestore Rules**: Regras de segurança para dados
- **Tokenização**: Cartões tokenizados via Mercado Pago
- **Permissões**: Controle de acesso por estabelecimento

## 📊 Principais Integrações

### Firebase
- **Firestore**: Banco de dados principal
- **Functions**: Backend serverless
- **Auth**: Autenticação de usuários
- **Storage**: Armazenamento de imagens

### Mercado Pago
- **Pagamentos**: Processamento de pagamentos
- **Assinaturas**: Sistema de assinatura recorrente
- **Webhooks**: Notificações de pagamento
- **Customers**: Gestão de clientes

## 🚀 Deploy

### Firebase Functions
```bash
cd functions
npm install
firebase deploy --only functions
```

### App Store / Google Play
```bash
eas build --platform all
eas submit --platform all
```

## 📈 Monitoramento

- **Firebase Analytics**: Métricas de uso
- **Crashlytics**: Relatórios de erro
- **Logs**: Sistema de logs detalhado
- **Performance**: Monitoramento de performance

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📞 Suporte

Para suporte técnico ou dúvidas sobre o projeto, entre em contato com a equipe de desenvolvimento.

---

**Desenvolvido para PediFácil** 🚀
*Sistema completo de gestão para estabelecimentos parceiros*
