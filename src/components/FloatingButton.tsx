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

const { width } = Dimensions.get('window');

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
  const [minimumOrderModal, setMinimumOrderModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [isAnimating, setIsAnimating] = useState(false);
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
    {
      icon: 'cash',
      label: 'Pedido mínimo para entrega',
      onPress: () => {
        if (isLoading) {
          Alert.alert('Aguarde', 'Carregando configurações...');
          return;
        }
        setMinimumOrderModal(true);
      },
    },
  ];

  const toggleMenu = () => {
    if (isAnimating) return;
    
    const toValue = isExpanded ? 0 : 1;
    setIsAnimating(true);
    
    Animated.spring(animation, {
      toValue,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start(() => {
      setIsAnimating(false);
    });
    
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
              inputRange: [0, 0.7, 1],
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
                    zIndex: 1000 + index,
                  }
                ]}
                pointerEvents={isExpanded && !isAnimating ? 'auto' : 'none'}
              >
                <View style={styles.labelContainer}>
                  <Text 
                    style={styles.menuLabel}
                    numberOfLines={2}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.8}
                  >
                    {option.label}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={() => {
                    if (isAnimating) return;
                    option.onPress();
                    toggleMenu();
                  }}
                  disabled={!isExpanded || isAnimating}
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
          disabled={isAnimating}
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
        minimumOrderModal={minimumOrderModal}
        setScheduleModal={setScheduleModal}
        setDeliveryTimeModal={setDeliveryTimeModal}
        setCardFlagsModal={setCardFlagsModal}
        setPickupModal={setPickupModal}
        setMinimumOrderModal={setMinimumOrderModal}
        settings={settings}
        onSettingsChange={loadSettings}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 1000,
    backgroundColor: 'transparent',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  menuContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    zIndex: 999,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.orange,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabActive: {
    backgroundColor: colors.red[500],
  },
  menuItem: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.orange,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  menuButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 28,
  },
  labelContainer: {
    position: 'absolute',
    right: 70,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    minWidth: 120,
    maxWidth: Math.min(width * 0.6, 200),
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    color: colors.gray[800],
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    flexWrap: 'wrap',
  },
}); 