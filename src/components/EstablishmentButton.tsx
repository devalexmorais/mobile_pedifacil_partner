import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEstablishment } from '@/contexts/EstablishmentContext';
import { usePaymentStatus } from '@/hooks/usePaymentStatus';
import { colors } from '@/styles/theme/colors';
import { BlockedEstablishmentWarning } from './BlockedEstablishmentWarning';

export function EstablishmentButton() {
  const { isOpen } = useEstablishment();
  const { paymentStatus } = usePaymentStatus();
  const [showBlockedInfo, setShowBlockedInfo] = useState(false);

  const getStatusText = () => {
    if (paymentStatus.isBlocked) return "Bloqueado por Pagamento";
    return isOpen ? "Estabelecimento Aberto" : "Estabelecimento Fechado";
  };

  const handlePress = () => {
    if (paymentStatus.isBlocked) {
      setShowBlockedInfo(true);
    }
  };

  return (
    <>
      <TouchableOpacity 
        style={styles.container}
        onPress={handlePress}
        disabled={!paymentStatus.isBlocked}
      >
        <View style={[
          styles.button,
          isOpen ? styles.buttonOpen : styles.buttonClosed,
          paymentStatus.isBlocked && styles.buttonBlocked
        ]}>
          <View style={styles.buttonContent}>
            <Ionicons 
              name={paymentStatus.isBlocked ? "alert-circle" : isOpen ? "radio-button-on" : "radio-button-off"} 
              size={20} 
              color={paymentStatus.isBlocked ? colors.red[500] : isOpen ? colors.green[500] : colors.red[500]} 
            />
            <Text style={[
              styles.text,
              { color: paymentStatus.isBlocked ? colors.red[500] : isOpen ? colors.green[500] : colors.red[500] }
            ]}>
              {getStatusText()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {showBlockedInfo && (
        <BlockedEstablishmentWarning 
          onUpgradePress={() => setShowBlockedInfo(false)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: colors.gray[200],
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  buttonOpen: {
    backgroundColor: colors.green[50],
  },
  buttonClosed: {
    backgroundColor: colors.red[50],
  },
  buttonBlocked: {
    backgroundColor: colors.red[50],
    opacity: 0.9,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
}); 