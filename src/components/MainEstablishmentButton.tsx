import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { establishmentService } from '../services/establishmentService';

export function MainEstablishmentButton() {
  const [status, setStatus] = useState<{
    isOpen: boolean;
    operationMode: string;
    lastStatusChange: string;
    statusChangeReason: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
    // Inicia a verificação automática
    establishmentService.startAutoStatusCheck();
    
    // Limpa o intervalo quando o componente é desmontado
    return () => {
      establishmentService.stopAutoStatusCheck();
    };
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const currentStatus = await establishmentService.getEstablishmentStatus();
      setStatus(currentStatus);
    } catch (error) {
      console.error('Erro ao carregar status:', error);
      Alert.alert('Erro', 'Não foi possível carregar o status do estabelecimento');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      setLoading(true);
      const newStatus = !status?.isOpen;
      await establishmentService.toggleEstablishmentStatus(newStatus);
      await loadStatus(); // Recarrega o status após a mudança
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      Alert.alert(
        'Não é possível fechar a loja',
        error instanceof Error ? error.message : 'Existem pedidos pendentes que precisam ser processados antes de fechar a loja.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading || !status) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: status.isOpen ? '#4CAF50' : '#FF3B30' }]}
        onPress={handleToggleStatus}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {status.isOpen ? 'Estabelecimento Aberto' : 'Estabelecimento Fechado'}
        </Text>
        <Text style={styles.subText}>
          {status.isOpen ? 'Toque para fechar' : 'Toque para abrir'}
        </Text>
        <Text style={styles.modeText}>
          Modo: {status.operationMode === establishmentService.OPERATION_MODE.MANUAL ? 'Manual' : 'Automático'}
        </Text>
      </TouchableOpacity>
      
      {status.statusChangeReason && (
        <Text style={styles.reasonText}>
          Última alteração: {status.statusChangeReason}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 20,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    width: '90%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  subText: {
    color: 'white',
    fontSize: 14,
    marginTop: 5,
  },
  modeText: {
    color: 'white',
    fontSize: 12,
    marginTop: 5,
    opacity: 0.8,
  },
  reasonText: {
    marginTop: 10,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
}); 