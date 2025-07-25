#!/bin/bash

# Script para implantar as correções do sistema de notificações
# Autor: Sistema de Notificações PediFacil
# Data: $(date)

echo "🚀 Iniciando implantação das correções do sistema de notificações..."
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "firestore.rules" ]; then
    echo "❌ Erro: Execute este script na raiz do projeto"
    exit 1
fi

# Verificar se o Firebase CLI está instalado
if ! command -v firebase &> /dev/null; then
    echo "❌ Erro: Firebase CLI não está instalado"
    echo "Instale com: npm install -g firebase-tools"
    exit 1
fi

# Verificar se está logado no Firebase
if ! firebase projects:list &> /dev/null; then
    echo "❌ Erro: Não está logado no Firebase"
    echo "Faça login com: firebase login"
    exit 1
fi

echo "✅ Verificações iniciais concluídas"
echo ""

# 1. Implantar regras do Firestore
echo "📋 Implantando regras do Firestore..."
firebase deploy --only firestore:rules

if [ $? -eq 0 ]; then
    echo "✅ Regras do Firestore implantadas com sucesso"
else
    echo "❌ Erro ao implantar regras do Firestore"
    exit 1
fi

echo ""

# 2. Implantar Cloud Functions
echo "⚡ Implantando Cloud Functions..."
cd functions

# Verificar se as dependências estão instaladas
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências das Cloud Functions..."
    npm install
fi

# Voltar para o diretório raiz
cd ..

# Implantar apenas as funções de notificação
echo "🚀 Implantando funções de notificação..."
firebase deploy --only functions:sendOrderStatusNotification,functions:sendNotificationOnCreate

if [ $? -eq 0 ]; then
    echo "✅ Cloud Functions implantadas com sucesso"
else
    echo "❌ Erro ao implantar Cloud Functions"
    exit 1
fi

echo ""

# 3. Verificar status da implantação
echo "🔍 Verificando status da implantação..."
firebase functions:list

echo ""
echo "🎉 Implantação concluída com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "1. Teste as notificações em ambiente de desenvolvimento"
echo "2. Verifique os logs do Firebase Functions"
echo "3. Monitore o console do app para logs de debug"
echo ""
echo "📚 Documentação: CORRECAO_NOTIFICACOES_README.md"
echo ""
echo "🔧 Para verificar logs das Cloud Functions:"
echo "firebase functions:log --only sendOrderStatusNotification,sendNotificationOnCreate" 