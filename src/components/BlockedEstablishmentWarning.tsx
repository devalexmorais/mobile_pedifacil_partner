import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/styles/theme/colors';

interface BlockedEstablishmentWarningProps {
  onUpgradePress: () => void;
}

export function BlockedEstablishmentWarning({ onUpgradePress }: BlockedEstablishmentWarningProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="lock-closed" size={48} color={colors.gray[400]} />
      
      <Text style={styles.title}>Recurso Premium</Text>
      
      <Text style={styles.description}>
        Promoções são exclusivas para estabelecimentos premium. 
        Faça upgrade do seu plano para acessar este e outros recursos exclusivos.
      </Text>
      
      <TouchableOpacity style={styles.upgradeButton} onPress={onUpgradePress}>
        <Text style={styles.upgradeButtonText}>Fazer Upgrade</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.white,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.gray[800],
    marginTop: 16,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: colors.gray[600],
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  upgradeButton: {
    backgroundColor: colors.orange,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: colors.orange,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  upgradeButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
}); 