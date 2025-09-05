# Sistema Inteligente de Notificações - PediFácil Parceiros

## 🔍 Problema Resolvido
As notificações locais estavam aparecendo mesmo quando o app estava em background ou fechado, causando duplicação de notificações.

## ✅ Solução Implementada
Sistema inteligente que detecta automaticamente o estado do app e usa a abordagem mais eficiente para cada situação:

### 📱 Quando o App está em FOREGROUND (ativo):
- Firebase envia notificação para o listener `onMessage()`
- App recebe e exibe notificação local usando `showLocalNotification()`
- Controle total sobre a aparência e comportamento

### 🔄 Quando o App está em BACKGROUND ou FECHADO:
- Firebase automaticamente exibe a notificação no sistema operacional
- **NÃO** usa notificação local - o próprio FCM cuida da exibição
- Sem duplicação de notificações

## 🛠️ Implementação Técnica

### 1. Detecção de Estado do App
```typescript
// Controle do estado do app
let isAppInForeground = true;

const handleAppStateChange = (nextAppState: string) => {
  isAppInForeground = nextAppState === 'active';
  console.log(`📱 Estado do app alterado: ${nextAppState} - Foreground: ${isAppInForeground}`);
};
```

### 2. Função Inteligente de Notificação
```typescript
const showLocalNotification = async (title: string, body: string, data: any = {}) => {
  if (!isAppInForeground) {
    console.log('🚫 App em background - FCM nativo cuidará da notificação');
    return; // Não exibe notificação local
  }

  // Só exibe notificação local se app estiver em foreground
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: true },
    trigger: null,
  });
};
```

### 3. Listeners FCM
```typescript
// Foreground: Mostra notificação local
messaging().onMessage(async remoteMessage => {
  if (remoteMessage.notification) {
    await showLocalNotification(
      remoteMessage.notification.title,
      remoteMessage.notification.body,
      remoteMessage.data
    );
  }
});

// Background: FCM nativo cuida automaticamente
messaging().setBackgroundMessageHandler(async remoteMessage => {
  // FCM já exibiu automaticamente no SO
  // Não precisa fazer nada
});
```

## 📋 Arquivos Modificados

### 1. `src/services/notificationService.ts`
- ✅ Adicionado controle de estado do app
- ✅ Implementada função `showLocalNotification` inteligente
- ✅ Configurados listeners FCM
- ✅ Atualizada função `setupPushNotifications`

### 2. `src/App.tsx`
- ✅ Implementado sistema inteligente de inicialização
- ✅ Configurado token FCM nativo
- ✅ Adicionado monitoramento de autenticação

### 3. `src/index.js`
- ✅ Removida importação desnecessária do messaging_background.js
- ✅ Handler de background já implementado no notificationService.ts

## 🔧 Configurações Necessárias

### Android (app.json)
```json
{
  "expo": {
    "android": {
      "permissions": [
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE"
      ]
    }
  }
}
```

### iOS (app.json)
```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["fetch"]
      }
    }
  }
}
```

## 🚀 Como Funciona

1. **Inicialização**: App solicita permissões FCM e obtém token nativo
2. **Detecção**: Sistema monitora mudanças de estado do app
3. **Foreground**: Notificações FCM → Listener `onMessage` → Notificação local
4. **Background**: Notificações FCM → Sistema operacional (automático)
5. **Resultado**: Sem duplicação, sempre uma notificação por evento

## ✨ Benefícios

- ✅ **Sem duplicação**: Apenas uma notificação por evento
- ✅ **Eficiência**: Usa a abordagem mais eficiente para cada estado
- ✅ **Confiabilidade**: FCM nativo garante entrega em background
- ✅ **Controle**: Notificações locais permitem customização em foreground
- ✅ **Simplicidade**: Sistema automático, sem configuração manual

## 🧪 Testando o Sistema

1. **Foreground**: Abra o app e envie uma notificação → Deve aparecer notificação local
2. **Background**: Minimize o app e envie notificação → Deve aparecer notificação nativa do SO
3. **Fechado**: Feche o app e envie notificação → Deve aparecer notificação nativa do SO

## 📝 Logs de Debug

O sistema inclui logs detalhados para debug:
- `📱 Estado do app alterado: active - Foreground: true`
- `🔔 FCM mensagem recebida em foreground`
- `🚫 App em background - FCM nativo cuidará da notificação`
- `✅ Sistema inteligente de notificações inicializado com sucesso`

---

**Sistema implementado com sucesso!** 🎉
As notificações locais agora só aparecem quando o app está em foreground, resolvendo o problema de duplicação.