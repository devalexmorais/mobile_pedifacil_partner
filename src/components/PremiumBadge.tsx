import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePremium } from '../hooks/usePremium';

export function PremiumBadge() {
  const { isPremium, daysRemaining, loading } = usePremium();

  if (loading || !isPremium) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Premium</Text>
      <Text style={styles.days}>{daysRemaining} dias restantes</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFD700',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  text: {
    color: '#000',
    fontWeight: 'bold',
  },
  days: {
    fontSize: 12,
    color: '#666',
  },
}); 