import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';

interface LimitWarningModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  maxProducts: number;
}

export function LimitWarningModal({
  visible,
  onClose,
  onUpgrade,
  maxProducts
}: LimitWarningModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.limitWarningContainer}>
        <View style={styles.limitWarningContent}>
          <Text style={styles.limitWarningText}>
            Limite de produtos atingido
          </Text>
          <Text style={styles.limitWarningDetails}>
            Você atingiu o limite de {maxProducts} produtos do plano gratuito.
          </Text>
          <Text style={styles.limitWarningDetails}>
            Para adicionar mais produtos, faça upgrade para o plano Premium!
          </Text>
          <View style={styles.warningButtons}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Text style={styles.closeButtonText}>Fechar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={onUpgrade}
            >
              <Text style={styles.upgradeButtonText}>Upgrade</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  limitWarningContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  limitWarningContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    maxWidth: 300,
  },
  limitWarningText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  limitWarningDetails: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
  },
  warningButtons: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  closeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    flex: 1,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  upgradeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FFA500',
    flex: 1,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: 'white',
    fontWeight: '600',
  },
}); 