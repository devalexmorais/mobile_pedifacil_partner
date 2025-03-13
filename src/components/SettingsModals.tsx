import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Switch,
  StatusBar,
  SafeAreaView,
  Platform,
  Dimensions,
  Pressable,
  Animated,
  PanResponder,
  Easing,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/theme/colors';
import { establishmentSettingsService, CardFlag as CardFlagType, Schedule } from '../services/establishmentSettingsService';

type CardFlag = {
  name: string;
  enabled: boolean;
  fee: string;
};

type SettingsModalsProps = {
  scheduleModal: boolean;
  deliveryTimeModal: boolean;
  cardFlagsModal: boolean;
  pickupModal: boolean;
  setScheduleModal: (visible: boolean) => void;
  setDeliveryTimeModal: (visible: boolean) => void;
  setCardFlagsModal: (visible: boolean) => void;
  setPickupModal: (visible: boolean) => void;
};

export function SettingsModals({
  scheduleModal,
  deliveryTimeModal,
  cardFlagsModal,
  pickupModal,
  setScheduleModal,
  setDeliveryTimeModal,
  setCardFlagsModal,
  setPickupModal
}: SettingsModalsProps) {
  // Estado para tempo mínimo e máximo de entrega
  const [minDeliveryTime, setMinDeliveryTime] = useState('30');
  const [maxDeliveryTime, setMaxDeliveryTime] = useState('45');

  // Estado para bandeiras de cartão
  const [cardFlags, setCardFlags] = useState<CardFlag[]>([
    { name: 'Visa', enabled: true, fee: '2.5' },
    { name: 'Mastercard', enabled: true, fee: '2.8' },
    { name: 'Elo', enabled: true, fee: '3.0' },
    { name: 'American Express', enabled: false, fee: '3.5' },
    { name: 'Hipercard', enabled: false, fee: '3.2' }
  ]);

  // Estado para horários de funcionamento
  const [scheduleData, setScheduleData] = useState<Schedule>({
    segunda: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
    terca: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
    quarta: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
    quinta: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
    sexta: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
    sabado: { isOpen: true, openTime: '08:00', closeTime: '12:00' },
    domingo: { isOpen: false, openTime: '00:00', closeTime: '00:00' }
  });

  // Estado para configuração de retirada
  const [allowPickup, setAllowPickup] = useState(true);
  const [pickupTime, setPickupTime] = useState('15');

  // Estado de carregamento
  const [loading, setLoading] = useState(false);

  // Estado para controlar as animações dos modais individualmente
  const [closing, setClosing] = useState(false);
  
  // Animação para o modal deslizar
  const panY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  
  const translateY = panY.interpolate({
    inputRange: [-1, 0, 1, height],
    outputRange: [0, 0, 1, height / 1.5],
    extrapolate: 'clamp',
  });

  // Resetar o estado quando os modais forem abertos
  useEffect(() => {
    if (scheduleModal || deliveryTimeModal || cardFlagsModal || pickupModal) {
      panY.setValue(0);
      opacity.setValue(1);
      setClosing(false);
    }
  }, [scheduleModal, deliveryTimeModal, cardFlagsModal, pickupModal]);

  // Resetar a posição do modal
  const resetModalPosition = () => {
    setClosing(false);
    Animated.spring(panY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 120,
      friction: 8,
    }).start();
  };

  // Fechar o modal com animação
  const closeModal = (setModal: (visible: boolean) => void) => {
    if (closing) return; // Evitar chamadas múltiplas durante a animação
    
    setClosing(true);
    
    Animated.parallel([
      Animated.timing(panY, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      })
    ]).start(() => {
      setModal(false);
      // Resetamos os valores após o modal fechar completamente
      setTimeout(() => {
        panY.setValue(0);
        opacity.setValue(1);
        setClosing(false);
      }, 100);
    });
  };

  // Configuração do PanResponder para detectar gestos
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !closing, // Não responder a gestos se estiver fechando
      onMoveShouldSetPanResponder: () => !closing, // Não responder a gestos se estiver fechando
      onPanResponderMove: (evt, gestureState) => {
        // Só permitir arrastar para baixo
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
          // Diminuir a opacidade enquanto arrasta
          const newOpacity = Math.max(1 - (gestureState.dy / (height / 2)), 0.5);
          opacity.setValue(newOpacity);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        // Se o usuário arrastou para baixo o suficiente, fechar o modal
        if (gestureState.dy > 80 || gestureState.vy > 0.5) { // Também considera a velocidade
          // Determinar qual modal está aberto e fechá-lo
          if (scheduleModal) closeModal(setScheduleModal);
          else if (deliveryTimeModal) closeModal(setDeliveryTimeModal);
          else if (cardFlagsModal) closeModal(setCardFlagsModal);
          else if (pickupModal) closeModal(setPickupModal);
        } else {
          // Caso contrário, retornar à posição original
          resetModalPosition();
        }
      },
    })
  ).current;

  // Função para escolher qual função de fechar chamar com base no modal ativo
  const handleCloseActiveModal = () => {
    if (scheduleModal) closeModal(setScheduleModal);
    else if (deliveryTimeModal) closeModal(setDeliveryTimeModal);
    else if (cardFlagsModal) closeModal(setCardFlagsModal);
    else if (pickupModal) closeModal(setPickupModal);
  };

  const toggleCardFlag = (index: number) => {
    const newFlags = [...cardFlags];
    newFlags[index].enabled = !newFlags[index].enabled;
    setCardFlags(newFlags);
  };

  const updateCardFlagFee = (index: number, fee: string) => {
    const newFlags = [...cardFlags];
    newFlags[index].fee = fee;
    setCardFlags(newFlags);
  };

  const toggleDaySchedule = (day: keyof typeof scheduleData) => {
    setScheduleData(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        isOpen: !prev[day].isOpen
      }
    }));
  };

  const updateDaySchedule = (day: keyof typeof scheduleData, field: 'openTime' | 'closeTime', value: string) => {
    setScheduleData(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  // Efeito para carregar dados de configuração quando o componente montar
  useEffect(() => {
    initializeSettings();
  }, []);

  // Inicializar configurações
  const initializeSettings = async () => {
    try {
      await establishmentSettingsService.initializeSettings();
    } catch (error) {
      console.error('Erro ao inicializar configurações:', error);
    }
  };

  // Efeito para carregar dados quando os modais são abertos
  useEffect(() => {
    if (cardFlagsModal) {
      loadCardFlags();
    }
  }, [cardFlagsModal]);

  useEffect(() => {
    if (deliveryTimeModal) {
      loadDeliveryTime();
    }
  }, [deliveryTimeModal]);

  useEffect(() => {
    if (pickupModal) {
      loadPickupSettings();
    }
  }, [pickupModal]);

  useEffect(() => {
    if (scheduleModal) {
      loadSchedule();
    }
  }, [scheduleModal]);

  // Funções para carregar dados
  const loadCardFlags = async () => {
    try {
      setLoading(true);
      const flags = await establishmentSettingsService.getCardFlags();
      if (flags.length > 0) {
        setCardFlags(flags);
      }
    } catch (error) {
      console.error('Erro ao carregar bandeiras de cartão:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDeliveryTime = async () => {
    try {
      setLoading(true);
      const { minTime, maxTime } = await establishmentSettingsService.getDeliveryTime();
      setMinDeliveryTime(minTime);
      setMaxDeliveryTime(maxTime);
    } catch (error) {
      console.error('Erro ao carregar tempo de entrega:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPickupSettings = async () => {
    try {
      setLoading(true);
      const { enabled, estimatedTime } = await establishmentSettingsService.getPickupSettings();
      setAllowPickup(enabled);
      setPickupTime(estimatedTime);
    } catch (error) {
      console.error('Erro ao carregar configurações de retirada:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const schedule = await establishmentSettingsService.getSchedule();
      setScheduleData(schedule);
    } catch (error) {
      console.error('Erro ao carregar horários de funcionamento:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveDeliveryTime = async () => {
    try {
      setLoading(true);
      await establishmentSettingsService.saveDeliveryTime(minDeliveryTime, maxDeliveryTime);
      Alert.alert('Sucesso', 'Tempo de entrega atualizado com sucesso!');
      closeModal(setDeliveryTimeModal);
    } catch (error) {
      console.error('Erro ao salvar tempo de entrega:', error);
      Alert.alert('Erro', 'Não foi possível salvar o tempo de entrega. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const saveCardFlags = async () => {
    try {
      setLoading(true);
      await establishmentSettingsService.saveCardFlags(cardFlags);
      Alert.alert('Sucesso', 'Bandeiras de cartão atualizadas com sucesso!');
      closeModal(setCardFlagsModal);
    } catch (error) {
      console.error('Erro ao salvar bandeiras de cartão:', error);
      Alert.alert('Erro', 'Não foi possível salvar as bandeiras de cartão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const saveSchedule = async () => {
    try {
      setLoading(true);
      await establishmentSettingsService.saveSchedule(scheduleData);
      Alert.alert('Sucesso', 'Horários de funcionamento atualizados com sucesso!');
      closeModal(setScheduleModal);
    } catch (error) {
      console.error('Erro ao salvar horários de funcionamento:', error);
      Alert.alert('Erro', 'Não foi possível salvar os horários de funcionamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const savePickupSettings = async () => {
    try {
      setLoading(true);
      await establishmentSettingsService.savePickupSettings(allowPickup, pickupTime);
      Alert.alert('Sucesso', 'Configurações de retirada atualizadas com sucesso!');
      closeModal(setPickupModal);
    } catch (error) {
      console.error('Erro ao salvar configurações de retirada:', error);
      Alert.alert('Erro', 'Não foi possível salvar as configurações de retirada. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Função para renderizar a barra visual no topo do modal (estilo iOS)
  const renderModalHandle = () => (
    <View style={styles.modalHandleContainer}>
      <View style={styles.modalHandle} />
    </View>
  );

  // Modificar os botões de salvar para mostrar indicadores de carregamento
  const renderSaveButton = (
    onPress: () => void, 
    text: string = 'Salvar',
    isLoading: boolean = loading
  ) => (
    <TouchableOpacity
      style={styles.saveButton}
      onPress={onPress}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#FFF" />
      ) : (
        <Text style={styles.saveButtonText}>{text}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <>
      {/* Modal para Editar Tempo de Entrega */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={deliveryTimeModal}
        onRequestClose={() => setDeliveryTimeModal(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.iOSStyleModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tempo de Entrega</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setDeliveryTimeModal(false)}
              >
                <Ionicons name="close-circle" size={30} color={colors.orange} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tempo mínimo (minutos)</Text>
                <TextInput
                  style={styles.input}
                  value={minDeliveryTime}
                  onChangeText={setMinDeliveryTime}
                  keyboardType="numeric"
                  placeholder="Ex: 30"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tempo máximo (minutos)</Text>
                <TextInput
                  style={styles.input}
                  value={maxDeliveryTime}
                  onChangeText={setMaxDeliveryTime}
                  keyboardType="numeric"
                  placeholder="Ex: 45"
                />
              </View>

              {renderSaveButton(saveDeliveryTime)}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal para Editar Bandeiras de Cartão */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={cardFlagsModal}
        onRequestClose={() => setCardFlagsModal(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.iOSStyleModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bandeiras de Cartão</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setCardFlagsModal(false)}
              >
                <Ionicons name="close-circle" size={30} color={colors.orange} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              {cardFlags.map((flag, index) => (
                <View key={flag.name} style={styles.cardFlagItem}>
                  <View style={styles.cardFlagHeader}>
                    <Text style={styles.cardFlagName}>{flag.name}</Text>
                    <Switch
                      value={flag.enabled}
                      onValueChange={() => toggleCardFlag(index)}
                      trackColor={{ false: '#d1d1d1', true: colors.orange }}
                      thumbColor={flag.enabled ? '#fff' : '#f4f3f4'}
                    />
                  </View>
                  
                  {flag.enabled && (
                    <View style={styles.feeContainer}>
                      <Text style={styles.feeLabel}>Taxa (%)</Text>
                      <TextInput
                        style={styles.feeInput}
                        value={flag.fee}
                        onChangeText={(value) => updateCardFlagFee(index, value)}
                        keyboardType="numeric"
                        placeholder="0.0"
                      />
                    </View>
                  )}
                </View>
              ))}

              {renderSaveButton(saveCardFlags)}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal para Editar Horários de Funcionamento */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={scheduleModal}
        onRequestClose={() => setScheduleModal(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.iOSStyleModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Horários de Funcionamento</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setScheduleModal(false)}
              >
                <Ionicons name="close-circle" size={30} color={colors.orange} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              {Object.entries(scheduleData).map(([day, data]) => (
                <View key={day} style={styles.scheduleItem}>
                  <View style={styles.scheduleHeader}>
                    <Text style={styles.dayName}>
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </Text>
                    <Switch
                      value={data.isOpen}
                      onValueChange={() => toggleDaySchedule(day as keyof typeof scheduleData)}
                      trackColor={{ false: '#d1d1d1', true: colors.orange }}
                      thumbColor={data.isOpen ? '#fff' : '#f4f3f4'}
                    />
                  </View>
                  
                  {data.isOpen && (
                    <View style={styles.timeContainer}>
                      <View style={styles.timeInputGroup}>
                        <Text style={styles.timeLabel}>Abre</Text>
                        <TextInput
                          style={styles.timeInput}
                          value={data.openTime}
                          onChangeText={(value) => updateDaySchedule(day as keyof typeof scheduleData, 'openTime', value)}
                          placeholder="08:00"
                        />
                      </View>
                      <View style={styles.timeInputGroup}>
                        <Text style={styles.timeLabel}>Fecha</Text>
                        <TextInput
                          style={styles.timeInput}
                          value={data.closeTime}
                          onChangeText={(value) => updateDaySchedule(day as keyof typeof scheduleData, 'closeTime', value)}
                          placeholder="18:00"
                        />
                      </View>
                    </View>
                  )}
                </View>
              ))}

              {renderSaveButton(saveSchedule)}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal para Editar Configurações de Retirada */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={pickupModal}
        onRequestClose={() => setPickupModal(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.iOSStyleModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Configurações de Retirada</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setPickupModal(false)}
              >
                <Ionicons name="close-circle" size={30} color={colors.orange} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.pickupSettings}>
                <View style={styles.pickupHeader}>
                  <Text style={styles.pickupTitle}>Permitir retirada no local</Text>
                  <Switch
                    value={allowPickup}
                    onValueChange={setAllowPickup}
                    trackColor={{ false: '#d1d1d1', true: colors.orange }}
                    thumbColor={allowPickup ? '#fff' : '#f4f3f4'}
                  />
                </View>
                
                {allowPickup && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Tempo para retirada (minutos)</Text>
                    <TextInput
                      style={styles.input}
                      value={pickupTime}
                      onChangeText={setPickupTime}
                      keyboardType="numeric"
                      placeholder="Ex: 15"
                    />
                  </View>
                )}
              </View>

              {renderSaveButton(savePickupSettings)}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  iOSStyleModal: {
    backgroundColor: '#fff',
    width: '100%',
    height: height * 0.85,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHandleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#ddd',
    borderRadius: 3,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  saveButton: {
    backgroundColor: colors.orange,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cardFlagsList: {
    flex: 1,
  },
  cardFlagItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardFlagHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardFlagName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  feeContainer: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  feeLabel: {
    fontSize: 14,
    color: '#666',
    width: 60,
  },
  feeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 8,
    marginLeft: 8,
    backgroundColor: '#fff',
  },
  scheduleList: {
    flex: 1,
  },
  scheduleItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  timeContainer: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeInputGroup: {
    flex: 1,
    marginRight: 8,
  },
  timeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    backgroundColor: '#fff',
  },
  pickupSettings: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#eee',
  },
  pickupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  pickupTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});
