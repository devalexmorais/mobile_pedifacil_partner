package com.pedifacil.deliveryparceiros;

import android.content.Intent;
import android.os.Bundle;
import androidx.annotation.Nullable;

import com.facebook.react.HeadlessJsTaskService;
import com.facebook.react.jstasks.HeadlessJsTaskConfig;
import com.facebook.react.bridge.Arguments;

// Classe para processar mensagens do Firebase em segundo plano
public class FirebaseMessagingHeadlessService extends HeadlessJsTaskService {
    
    @Nullable
    @Override
    protected HeadlessJsTaskConfig getTaskConfig(Intent intent) {
        Bundle extras = intent.getExtras();
        if (extras != null) {
            // Converter extras para WritableMap
            return new HeadlessJsTaskConfig(
                "FirebaseBackgroundMessageHandler", // Nome do módulo JS que irá processar a tarefa
                Arguments.fromBundle(extras),
                60000, // Tempo limite de 60 segundos
                true // Opção para permitir execução em aplicações em primeiro plano
            );
        }
        return null;
    }
} 