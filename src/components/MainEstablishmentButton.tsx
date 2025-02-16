import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { establishmentService } from '../services/establishmentService';

export function MainEstablishmentButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeAndLoadStatus();
  }, []);

  const initializeAndLoadStatus = async () => {
    try {
      // Inicializa o status se necessário
      await establishmentService.initializeEstablishmentStatus();
      // Carrega o status atual
      const status = await establishmentService.getEstablishmentStatus();
      setIsOpen(status);
    } catch (error) {
      console.error('Erro ao carregar status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      setLoading(true);
      const newStatus = !isOpen;
      await establishmentService.toggleEstablishmentStatus(newStatus);
      setIsOpen(newStatus);
    } catch (error) {
      console.error('Erro ao alterar status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#FFA500" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: isOpen ? '#4CAF50' : '#FF3B30' }
        ]}
        onPress={handleToggleStatus}
      >
        <Text style={styles.buttonText}>
          {isOpen ? 'Estabelecimento Aberto' : 'Estabelecimento Fechado'}
        </Text>
        <Text style={styles.subtitleText}>
          {isOpen ? 'Toque para fechar' : 'Toque para abrir'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  subtitleText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
}); 