import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/theme/colors';
import { SettingsModals } from './SettingsModals';

type FloatingButtonOption = {
  icon: string;
  label: string;
  onPress: () => void;
};

export function FloatingButton() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [scheduleModal, setScheduleModal] = useState(false);
  const [deliveryModal, setDeliveryModal] = useState(false);
  const [pickupModal, setPickupModal] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  const buttons: FloatingButtonOption[] = [
    {
      icon: 'time',
      label: 'Horários',
      onPress: () => setScheduleModal(true),
    },
    {
      icon: 'bicycle',
      label: 'Tempo de entrega',
      onPress: () => setDeliveryModal(true),
    },
    {
      icon: 'bag-check',
      label: 'Retirada',
      onPress: () => setPickupModal(true),
    },
  ];

  const toggleMenu = () => {
    const toValue = isExpanded ? 0 : 1;
    Animated.spring(animation, {
      toValue,
      friction: 5,
      useNativeDriver: true,
    }).start();
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.menuContainer}>
          {buttons.map((option, index) => {
            const translateY = animation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -((index + 1) * 65)],
            });

            const opacity = animation.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 0, 1],
            });

            const scale = animation.interpolate({
              inputRange: [0, 1],
              outputRange: [0.5, 1],
            });

            return (
              <Animated.View
                key={option.label}
                style={[
                  styles.menuItem,
                  {
                    opacity,
                    transform: [
                      { translateY },
                      { scale }
                    ],
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                  }
                ]}
              >
                <View style={styles.labelContainer}>
                  <Text style={styles.menuLabel}>{option.label}</Text>
                </View>
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={() => {
                    option.onPress();
                    toggleMenu();
                  }}
                >
                  <Ionicons name={option.icon as any} size={20} color="#FFF" />
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.fab, isExpanded && styles.fabActive]}
          onPress={toggleMenu}
        >
          <Ionicons
            name={isExpanded ? 'close' : 'add'}
            size={24}
            color="#FFF"
          />
        </TouchableOpacity>
      </View>

      <SettingsModals
        scheduleModal={scheduleModal}
        deliveryModal={deliveryModal}
        pickupModal={pickupModal}
        setScheduleModal={setScheduleModal}
        setDeliveryModal={setDeliveryModal}
        setPickupModal={setPickupModal}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    alignItems: 'flex-end',
  },
  fab: {
    backgroundColor: colors.orange,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1,
  },
  fabActive: {
    backgroundColor: '#f44336',
  },
  menuContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    height: 240,
    width: 140,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 4,
  },
  labelContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    elevation: 2,
  },
  menuButton: {
    backgroundColor: colors.orange,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  menuLabel: {
    color: '#333',
    fontSize: 13,
    fontWeight: '500',
  },
}); 