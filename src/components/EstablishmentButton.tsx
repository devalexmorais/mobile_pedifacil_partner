import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEstablishment } from '@/contexts/EstablishmentContext';
import { usePaymentStatus } from '@/hooks/usePaymentStatus';
import { colors } from '@/styles/theme/colors';
import { BlockedEstablishmentWarning } from './BlockedEstablishmentWarning';

export function EstablishmentButton() {
  const { isOpen } = useEstablishment();
  const { isBlocked, dueAmount, dueDate } = usePaymentStatus();
  const [showBlockedInfo, setShowBlockedInfo] = useState(false);

  const getStatusText = () => {
    if (isBlocked) return "Bloqueado por Pagamento";
    return isOpen ? "Estabelecimento Aberto" : "Estabelecimento Fechado";
  };

  const handlePress = () => {
    if (isBlocked) {
      setShowBlockedInfo(true);
    }
  };

  return (
    <>
      <TouchableOpacity 
        style={styles.container}
        onPress={handlePress}
        disabled={!isBlocked}
      >
        <View style={[
          styles.button,
          isOpen ? styles.buttonOpen : styles.buttonClosed,
          isBlocked && styles.buttonBlocked
        ]}>
          <View style={styles.buttonContent}>
            <Ionicons 
              name={isBlocked ? "alert-circle" : isOpen ? "radio-button-on" : "radio-button-off"} 
              size={20} 
              color={isBlocked ? colors.red[500] : isOpen ? colors.green[500] : colors.red[500]} 
            />
            <Text style={[
              styles.text,
              { color: isBlocked ? colors.red[500] : isOpen ? colors.green[500] : colors.red[500] }
            ]}>
              {getStatusText()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {showBlockedInfo && (
        <BlockedEstablishmentWarning 
          dueAmount={dueAmount}
          dueDate={dueDate}
          onClose={() => setShowBlockedInfo(false)}
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