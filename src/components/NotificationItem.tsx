import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { NotificationData } from '../services/notificationService';

interface NotificationItemProps {
  notification: NotificationData;
  onPress: (notification: NotificationData) => void;
}

export const NotificationItem = ({ notification, onPress }: NotificationItemProps) => {
  // Formatar a data
  const formattedDate = format(notification.createdAt, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        !notification.read && styles.unreadContainer
      ]} 
      onPress={() => onPress(notification)}
    >
      <View style={styles.iconContainer}>
        {notification.read ? (
          <Ionicons name="notifications-outline" size={24} color="#999" />
        ) : (
          <Ionicons name="notifications" size={24} color="#FFA500" />
        )}
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={[styles.title, !notification.read && styles.unreadText]}>
          {notification.title}
        </Text>
        
        <Text style={styles.body} numberOfLines={2}>
          {notification.body}
        </Text>
        
        <Text style={styles.date}>{formattedDate}</Text>
      </View>
      
      {!notification.read && (
        <View style={styles.unreadIndicator} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: 'white',
  },
  unreadContainer: {
    backgroundColor: '#FFF8E8',
  },
  iconContainer: {
    marginRight: 12,
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    color: '#333',
  },
  unreadText: {
    fontWeight: 'bold',
    color: '#000',
  },
  body: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  unreadIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFA500',
    alignSelf: 'flex-start',
    marginTop: 8,
  }
}); 