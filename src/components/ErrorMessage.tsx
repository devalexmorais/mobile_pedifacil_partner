import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';

interface ErrorMessageProps {
  message: string;
}

export const ErrorMessage = ({ message }: ErrorMessageProps) => {
  if (!message) return null;

  return (
    <Surface style={styles.container}>
      <View style={styles.content}>
        <MaterialIcons name="error-outline" size={24} color="#dc3545" />
        <Text style={styles.message}>{message}</Text>
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff5f5',
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
    elevation: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  message: {
    marginLeft: 8,
    color: '#dc3545',
    fontSize: 14,
    flex: 1,
  },
}); 