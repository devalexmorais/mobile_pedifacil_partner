package com.pedifacil.deliveryparceiros;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import com.facebook.react.HeadlessJsTaskService;

import java.util.Map;

// Implementação personalizada do serviço Firebase Messaging
public class FirebaseService extends FirebaseMessagingService {
    private static final String TAG = "FirebaseService";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Log.d(TAG, "Nova mensagem recebida do Firebase em segundo plano");
        
        // Registrar detalhes da mensagem para depuração
        if (remoteMessage.getNotification() != null) {
            Log.d(TAG, "Título da notificação: " + remoteMessage.getNotification().getTitle());
            Log.d(TAG, "Corpo da notificação: " + remoteMessage.getNotification().getBody());
        }
        
        // Converter dados da mensagem para um Bundle
        Bundle bundle = new Bundle();
        if (remoteMessage.getData().size() > 0) {
            for (Map.Entry<String, String> entry : remoteMessage.getData().entrySet()) {
                bundle.putString(entry.getKey(), entry.getValue());
            }
        }
        
        // Adicionar metadados da notificação ao bundle
        if (remoteMessage.getNotification() != null) {
            bundle.putString("title", remoteMessage.getNotification().getTitle());
            bundle.putString("body", remoteMessage.getNotification().getBody());
        }
        
        // Iniciar o serviço Headless JS (em segundo plano)
        Intent service = new Intent(this, FirebaseMessagingHeadlessService.class);
        service.putExtras(bundle);
        
        // Iniciar o serviço
        FirebaseMessagingHeadlessService.acquireWakeLockNow(this);
        startService(service);
    }

    @Override
    public void onNewToken(String token) {
        Log.d(TAG, "Novo token FCM recebido: " + token);
        // Você pode enviar este token para seu servidor aqui
    }
} 