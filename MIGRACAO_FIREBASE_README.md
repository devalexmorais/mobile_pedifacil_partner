# Migração Firebase - Resolução de Avisos

## Problemas Identificados

### 1. Avisos de Firebase Deprecated
```
WARN  This method is deprecated (as well as all React Native Firebase namespaced API) and will be removed in the next major release as part of move to match Firebase Web modular SDK API. Please see migration guide for more details: https://rnfirebase.io/migrating-to-v22 Please use `getApp()` instead.
```

**Causa:** O projeto estava usando uma mistura de duas versões do Firebase:
- **Firebase Web SDK** (versão modular) - usado em `src/config/firebase.ts`
- **React Native Firebase** (versão namespaced) - usado em alguns serviços

### 2. Aviso de Shadow
```
WARN  (ADVICE) View #243 of type RCTView has a shadow set but cannot calculate shadow efficiently. Consider setting a solid background color to fix this, or apply the shadow to a more specific component.
```

**Causa:** Algum componente está usando sombra sem cor de fundo sólida.

### 3. Logs de Notificações
```
LOG  Notificações push requerem um dispositivo físico
LOG  Não foi possível obter token de notificação
```

**Causa:** Testando em simulador, onde notificações push não funcionam.

## Soluções Implementadas

### 1. Migração Completa para Firebase Web SDK

#### Arquivos Modificados:
- `src/services/pushNotificationService.ts` - Migrado para usar apenas Expo Notifications
- `src/App.tsx` - Removidas importações do React Native Firebase
- `src/index.js` - Simplificado, removido React Native Firebase
- `package.json` - Removidas dependências do React Native Firebase
- `app.json` - Removidos plugins do React Native Firebase

#### Dependências Removidas:
```json
"@react-native-firebase/app": "^21.13.0",
"@react-native-firebase/auth": "^21.13.0",
"@react-native-firebase/firestore": "^21.13.0",
"@react-native-firebase/installations": "^21.13.0",
"@react-native-firebase/messaging": "^21.13.0"
```

#### Arquivos Deletados:
- `src/messaging_background.js` - Não mais necessário

### 2. Notificações Push Simplificadas

Agora usando apenas **Expo Notifications** para:
- Notificações locais
- Tokens de push
- Gerenciamento de permissões

**Vantagens:**
- ✅ Sem conflitos de versões
- ✅ API mais simples e consistente
- ✅ Melhor integração com Expo
- ✅ Menos dependências

### 3. Configuração Atualizada

#### Project ID do Expo:
```typescript
// Antes (incorreto)
projectId: 'pedifacil-6e91e'

// Depois (correto)
projectId: 'pedifacil-parceiros' // slug do app no app.json
```

## Resultados Esperados

### ✅ Avisos Resolvidos:
- [x] Avisos de Firebase deprecated removidos
- [x] Migração completa para Firebase Web SDK
- [x] Notificações funcionando com Expo Notifications

### ⚠️ Avisos Restantes (Menos Críticos):
- Aviso de shadow (não afeta funcionalidade)
- Logs de notificações em simulador (comportamento esperado)

## Próximos Passos

1. **Testar em dispositivo físico** para verificar notificações push
2. **Verificar componentes com shadow** e adicionar background color se necessário
3. **Monitorar logs** para garantir que não há mais avisos críticos

## Comandos Executados

```bash
# Limpar dependências
rm -rf node_modules package-lock.json

# Reinstalar
npm install

# Reiniciar o projeto
npm start
```

## Notas Importantes

- **Notificações push** só funcionam em dispositivos físicos
- **Firebase Web SDK** é a versão recomendada para React Native
- **Expo Notifications** é suficiente para a maioria dos casos de uso
- **Migração completa** elimina conflitos de versões 