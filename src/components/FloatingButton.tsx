import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  Animated,
  Alert,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/theme/colors';
import { SettingsModals } from './SettingsModals';
import { establishmentSettingsService } from '../services/establishmentSettingsService';

const { width, height } = Dimensions.get('window');

type FloatingButtonOption = {
  icon: string;
  label: string;
  onPress: () => void;
};

export function FloatingButton() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [scheduleModal, setScheduleModal] = useState(false);
  const [deliveryTimeModal, setDeliveryTimeModal] = useState(false);
  const [cardFlagsModal, setCardFlagsModal] = useState(false);
  const [pickupModal, setPickupModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const animation = useRef(new Animated.Value(0)).current;

  // Carregar configurações quando o componente é montado
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      await establishmentSettingsService.initializeSettings();
      
      // Carregar todas as configurações
      const [scheduleData, deliveryData, paymentOptionsData, pickupData] = await Promise.all([
        establishmentSettingsService.getSchedule(),
        establishmentSettingsService.getDeliveryTime(),
        establishmentSettingsService.getPaymentOptions(),
        establishmentSettingsService.getPickupSettings()
      ]);

      setSettings({
        schedule: scheduleData,
        delivery: deliveryData,
        paymentOptions: paymentOptionsData,
        pickup: pickupData
      });
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      Alert.alert('Erro', 'Não foi possível carregar as configurações. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const buttons: FloatingButtonOption[] = [
    {
      icon: 'time',
      label: 'Horários',
      onPress: () => {
        if (isLoading) {
          Alert.alert('Aguarde', 'Carregando configurações...');
          return;
        }
        setScheduleModal(true);
      },
    },
    {
      icon: 'bicycle',
      label: 'Tempo de entrega',
      onPress: () => {
        if (isLoading) {
          Alert.alert('Aguarde', 'Carregando configurações...');
          return;
        }
        setDeliveryTimeModal(true);
      },
    },
    {
      icon: 'card',
      label: 'Métodos de pagamento',
      onPress: () => {
        if (isLoading) {
          Alert.alert('Aguarde', 'Carregando configurações...');
          return;
        }
        setCardFlagsModal(true);
      },
    },
    {
      icon: 'bag-check',
      label: 'Retirada',
      onPress: () => {
        if (isLoading) {
          Alert.alert('Aguarde', 'Carregando configurações...');
          return;
        }
        setPickupModal(true);
      },
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
            size={30}
            color="#FFF"
          />
        </TouchableOpacity>
      </View>

      <SettingsModals
        scheduleModal={scheduleModal}
        deliveryTimeModal={deliveryTimeModal}
        cardFlagsModal={cardFlagsModal}
        pickupModal={pickupModal}
        setScheduleModal={setScheduleModal}
        setDeliveryTimeModal={setDeliveryTimeModal}
        setCardFlagsModal={setCardFlagsModal}
        setPickupModal={setPickupModal}
        settings={settings}
        onSettingsChange={loadSettings}
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
    zIndex: 9999,
    elevation: 10,
    width: 140,
    height: 350,
    pointerEvents: 'box-none',
  },
  fab: {
    backgroundColor: colors.orange,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    zIndex: 10000,
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  fabActive: {
    backgroundColor: '#f44336',
  },
  menuContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    height: 320,
    width: 140,
    zIndex: 9998,
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