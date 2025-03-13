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
  const animation = useRef(new Animated.Value(0)).current;

  // Inicializar configurações quando o componente é montado
  useEffect(() => {
    initSettings();
  }, []);

  const initSettings = async () => {
    try {
      await establishmentSettingsService.initializeSettings();
    } catch (error) {
      console.error('Erro ao inicializar configurações:', error);
    }
  };

  const buttons: FloatingButtonOption[] = [
    {
      icon: 'time',
      label: 'Horários',
      onPress: () => setScheduleModal(true),
    },
    {
      icon: 'bicycle',
      label: 'Tempo de entrega',
      onPress: () => setDeliveryTimeModal(true),
    },
    {
      icon: 'card',
      label: 'Bandeiras de cartão',
      onPress: () => setCardFlagsModal(true),
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
    width: 140, // Definindo largura explícita
    height: 350, // Definindo altura explícita para acomodar todo o menu
    pointerEvents: 'box-none', // Permite toques nos elementos abaixo quando não há conteúdo
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
    position: 'absolute', // Posicionamento absoluto
    bottom: 0, // No fundo do container
    right: 0, // À direita do container
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
    zIndex: 9998, // Garantir que fique abaixo do botão
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