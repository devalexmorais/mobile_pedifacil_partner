import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const EmptyNotifications = () => {
  return (
    <View style={styles.container}>
      <Ionicons name="notifications-off-outline" size={80} color="#DDD" />
      <Text style={styles.title}>Nenhuma Notificação</Text>
      <Text style={styles.subtitle}>
        Você não tem notificações no momento. 
        Quando receber pedidos ou atualizações importantes, elas aparecerão aqui.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFF',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
}); 