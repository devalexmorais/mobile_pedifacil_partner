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
              <Text style={styles.upgradeButtonText}>Fazer Upgrade</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // ... (copiar os estilos relevantes do arquivo original)
}); 