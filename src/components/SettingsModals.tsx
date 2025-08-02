import React, { useState,useEffect } from 'react';
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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../styles/theme/colors';
import { establishmentSettingsService, Schedule } from '../services/establishmentSettingsService';
import { formatCurrency } from '../utils/format';
import { deliveryFeeService, DeliveryFee } from '../services/deliveryFeeService';
import { addressService } from '../services/addressService';
import { establishmentService } from '../services/establishmentService';
import { useAuth } from '../contexts/AuthContext';
import { Feather } from '@expo/vector-icons';

type PaymentMethod = {
  type: string;
  enabled: boolean;
};

type CardBrands = {
  visa: boolean;
  mastercard: boolean;
  elo: boolean;
  amex: boolean;
  hipercard: boolean;
};

type PaymentOptions = {
  cartao: PaymentMethod & {
    brands: CardBrands;
  };
  dinheiro: PaymentMethod;
  pix: PaymentMethod;
};

interface SettingsModalsProps {
  scheduleModal: boolean;
  deliveryTimeModal: boolean;
  cardFlagsModal: boolean;
  pickupModal: boolean;
  minimumOrderModal: boolean;
  deliveryFeesModal: boolean;
  setScheduleModal: (value: boolean) => void;
  setDeliveryTimeModal: (value: boolean) => void;
  setCardFlagsModal: (value: boolean) => void;
  setPickupModal: (value: boolean) => void;
  setMinimumOrderModal: (value: boolean) => void;
  setDeliveryFeesModal: (value: boolean) => void;
  settings: {
    schedule: Schedule;
    delivery: {
      minTime: string;
      maxTime: string;
      minimumOrderAmount: string;
    };
    paymentOptions: PaymentOptions;
    pickup: {
      enabled: boolean;
      estimatedTime: string;
    };
  } | null;
  onSettingsChange: () => Promise<void>;
}

export function SettingsModals({
  scheduleModal,
  deliveryTimeModal,
  cardFlagsModal,
  pickupModal,
  minimumOrderModal,
  deliveryFeesModal,
  setScheduleModal,
  setDeliveryTimeModal,
  setCardFlagsModal,
  setPickupModal,
  setMinimumOrderModal,
  setDeliveryFeesModal,
  settings,
  onSettingsChange
}: SettingsModalsProps) {
  // Estados para tempo de entrega
  const [minDeliveryTime, setMinDeliveryTime] = useState(settings?.delivery?.minTime || '20');
  const [maxDeliveryTime, setMaxDeliveryTime] = useState(settings?.delivery?.maxTime || '45');
  
  // Estado para valor mínimo do pedido
  const [minimumOrderAmount, setMinimumOrderAmount] = useState(settings?.delivery?.minimumOrderAmount || '20');
  
  // Função para formatar o valor do input
  const formatInputValue = (value: string): string => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    if (numbers === '') return '';
    
    // Converte para número e divide por 100 para considerar centavos
    const numericValue = parseFloat(numbers) / 100;
    
    // Formata usando a função existente
    return formatCurrency(numericValue);
  };

  // Função para extrair apenas números do valor formatado
  const extractNumericValue = (formattedValue: string): string => {
    const numbers = formattedValue.replace(/\D/g, '');
    if (numbers === '') return '';
    
    // Converte para número e divide por 100
    const numericValue = parseFloat(numbers) / 100;
    return numericValue.toString();
  };

  // Função para lidar com mudanças no input
  const handleMinimumOrderChange = (value: string) => {
    const formatted = formatInputValue(value);
    setMinimumOrderAmount(formatted);
  };
  
  // Estado para retirada
  const [allowPickup, setAllowPickup] = useState(settings?.pickup?.enabled || false);
  const [pickupTime, setPickupTime] = useState(settings?.pickup?.estimatedTime || '15');
  
  // Estado para métodos de pagamento
  const [paymentOptions, setPaymentOptions] = useState<PaymentOptions>(settings?.paymentOptions || {
    cartao: {
      type: 'Cartão',
      enabled: true,
      brands: {
        visa: true,
        mastercard: true,
        elo: false,
        amex: false,
        hipercard: false
      }
    },
    dinheiro: {
      type: 'Dinheiro',
      enabled: true
    },
    pix: {
      type: 'PIX',
      enabled: true
    }
  });
  
  // Estado para horários de funcionamento
  const [schedule, setSchedule] = useState<Schedule>(settings?.schedule || {
    domingo: { isOpen: false, openTime: '00:00', closeTime: '00:00' },
    segunda: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
    terca: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
    quarta: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
    quinta: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
    sexta: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
    sabado: { isOpen: true, openTime: '08:00', closeTime: '18:00' }
  });

  // Estados para taxas de entrega
  const { user } = useAuth();
  const [deliveryFees, setDeliveryFees] = useState<DeliveryFee[]>([]);
  const [isLoadingFees, setIsLoadingFees] = useState(true);
  const [storeCity, setStoreCity] = useState<string | null>(null);
  const [storeState, setStoreState] = useState<string | null>(null);
  
  // Modal states para taxas
  const [isEditFeeModalVisible, setIsEditFeeModalVisible] = useState(false);
  const [editingFee, setEditingFee] = useState<DeliveryFee | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [isSavingFee, setIsSavingFee] = useState(false);

  // Atualizar estados quando as configurações mudarem
  useEffect(() => {
    if (settings) {
      setMinDeliveryTime(settings.delivery.minTime);
      setMaxDeliveryTime(settings.delivery.maxTime);
      setMinimumOrderAmount(formatCurrency(parseFloat(settings.delivery.minimumOrderAmount) || 0));
      setAllowPickup(settings.pickup.enabled);
      setPickupTime(settings.pickup.estimatedTime);
      setPaymentOptions(settings.paymentOptions);
      setSchedule(settings.schedule);
    }
  }, [settings]);

  // Carregar taxas de entrega quando o modal for aberto
  useEffect(() => {
    if (deliveryFeesModal && user?.uid) {
      loadDeliveryFees();
    }
  }, [deliveryFeesModal, user]);

  // Função para formatar valor para BRL
  const formatToBRL = (value: number): string => {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Função para limpar formatação e converter para número
  const cleanFormat = (value: string): number => {
    const cleanValue = value.replace(/[^\d]/g, '');
    return parseFloat(cleanValue) / 100;
  };

  const loadDeliveryFees = async () => {
    try {
      if (!user?.uid) return;
      setIsLoadingFees(true);

      // Obter dados do estabelecimento para identificar a cidade
      const partnerData = await establishmentService.getPartnerData();
      if (!partnerData || !partnerData.address) {
        Alert.alert('Erro', 'Não foi possível obter os dados do estabelecimento');
        setIsLoadingFees(false);
        return;
      }

      const storeStateId = partnerData.address.state;
      const storeCityId = partnerData.address.city;
      
      setStoreState(storeStateId);
      setStoreCity(storeCityId);

      // Carregar os bairros apenas da cidade do estabelecimento
      const neighborhoodsFromCity = await addressService.getNeighborhoods(storeStateId, storeCityId);

      // Carregar taxas existentes
      const existingFees = await deliveryFeeService.getAllDeliveryFees(user.uid);
      
      // Criar um mapa de taxas existentes por bairro
      const feesByNeighborhood = new Map(
        existingFees.map(fee => [fee.neighborhood.toLowerCase(), fee])
      );

      // Criar lista final de taxas, incluindo bairros sem taxa (com valor 0)
      const allFees: DeliveryFee[] = neighborhoodsFromCity.map(neighborhood => {
        const existingFee = feesByNeighborhood.get(neighborhood.name.toLowerCase());
        if (existingFee) {
          return existingFee;
        }
        
        // Criar uma taxa temporária com o formato correto da interface DeliveryFee
        return {
          id: `temp_${neighborhood.id}`,
          neighborhood: neighborhood.name,
          fee: 0,
          storeId: user.uid,
          createdAt: "2025-05-06T23:28:21.833Z",
          updatedAt: new Date().toISOString()
        };
      });

      // Ordenar por nome do bairro
      allFees.sort((a, b) => a.neighborhood.localeCompare(b.neighborhood));

      setDeliveryFees(allFees);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados');
    } finally {
      setIsLoadingFees(false);
    }
  };

  const handleEditFee = (fee: DeliveryFee) => {
    setEditingFee(fee);
    setEditingValue(formatToBRL(fee.fee));
    setIsEditFeeModalVisible(true);
  };

  const handleCloseEditFeeModal = () => {
    setIsEditFeeModalVisible(false);
    setEditingFee(null);
    setEditingValue('');
  };

  const handleSaveFee = async () => {
    if (!editingFee || !user?.uid) return;

    try {
      setIsSavingFee(true);
      
      // Converter o valor formatado para número
      const value = cleanFormat(editingValue);
      if (isNaN(value) || value < 0) {
        Alert.alert('Erro', 'Por favor, insira um valor válido');
        return;
      }

      // Se é uma taxa temporária e o valor é maior que 0, criar nova no banco
      if (editingFee.id.startsWith('temp_') && value > 0) {
        const newFeeId = await deliveryFeeService.createDeliveryFee({
          neighborhood: editingFee.neighborhood,
          fee: value,
          storeId: user.uid
        });

        // Atualizar o estado local com o novo ID
        setDeliveryFees(prev =>
          prev.map(f => f.id === editingFee.id ? { ...f, id: newFeeId, fee: value } : f)
        );
      } else if (!editingFee.id.startsWith('temp_')) {
        // Atualizar taxa existente
        await deliveryFeeService.updateDeliveryFee(user.uid, editingFee.id, {
          fee: value
        });

        setDeliveryFees(prev =>
          prev.map(f => f.id === editingFee.id ? { ...f, fee: value } : f)
        );
      }

      handleCloseEditFeeModal();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar a taxa de entrega');
    } finally {
      setIsSavingFee(false);
    }
  };

  const handleValueChange = (value: string) => {
    const formatted = formatInputValue(value);
    setEditingValue(formatted);
  };

  // Função para salvar tempo de entrega
  const handleSaveDeliveryTime = async () => {
    try {
      await establishmentSettingsService.saveDeliveryTime(minDeliveryTime, maxDeliveryTime);
      await onSettingsChange();
      Alert.alert('Sucesso', 'Tempo de entrega atualizado com sucesso!');
      setDeliveryTimeModal(false);
    } catch (error) {
      console.error('Erro ao salvar tempo de entrega:', error);
      Alert.alert('Erro', 'Não foi possível salvar o tempo de entrega. Tente novamente.');
    }
  };

  // Função para salvar valor mínimo do pedido
  const handleSaveMinimumOrderAmount = async () => {
    try {
      const numericValue = extractNumericValue(minimumOrderAmount);
      
      if (!numericValue || parseFloat(numericValue) <= 0) {
        Alert.alert('Erro', 'O valor mínimo deve ser maior que zero.');
        return;
      }
      
      await establishmentSettingsService.saveMinimumOrderAmount(numericValue);
      await onSettingsChange();
      Alert.alert('Sucesso', 'Valor mínimo do pedido atualizado com sucesso!');
      setMinimumOrderModal(false);
    } catch (error) {
      console.error('Erro ao salvar valor mínimo do pedido:', error);
      Alert.alert('Erro', 'Não foi possível salvar o valor mínimo do pedido. Tente novamente.');
    }
  };

  // Função para salvar configurações de retirada
  const handleSavePickupSettings = async () => {
    try {
      await establishmentSettingsService.savePickupSettings(allowPickup, pickupTime);
      await onSettingsChange();
      Alert.alert('Sucesso', 'Configurações de retirada atualizadas com sucesso!');
      setPickupModal(false);
    } catch (error) {
      console.error('Erro ao salvar configurações de retirada:', error);
      Alert.alert('Erro', 'Não foi possível salvar as configurações de retirada. Tente novamente.');
    }
  };

  // Função para atualizar método de pagamento
  const handlePaymentMethodChange = (method: keyof PaymentOptions, enabled: boolean) => {
    setPaymentOptions(prev => ({
      ...prev,
      [method]: {
        ...prev[method],
        enabled
      }
    }));
  };

  // Função para atualizar bandeira de cartão
  const handleCardBrandChange = (brand: keyof CardBrands, enabled: boolean) => {
    setPaymentOptions(prev => ({
      ...prev,
      cartao: {
        ...prev.cartao,
        brands: {
          ...prev.cartao.brands,
          [brand]: enabled
        }
      }
    }));
  };

  // Função para salvar métodos de pagamento
  const handleSavePaymentOptions = async () => {
    try {
      // Verifica se o cartão está ativo e se tem pelo menos uma bandeira selecionada
      if (paymentOptions.cartao.enabled) {
        const hasSelectedBrand = Object.values(paymentOptions.cartao.brands).some(value => value);
        if (!hasSelectedBrand) {
          Alert.alert(
            'Atenção',
            'Você precisa selecionar pelo menos uma bandeira de cartão antes de salvar.',
            [
              {
                text: 'OK',
                onPress: () => {}
              }
            ]
          );
          return;
        }
      }

      await establishmentSettingsService.savePaymentOptions(paymentOptions);
      await onSettingsChange();
      Alert.alert('Sucesso', 'Métodos de pagamento atualizados com sucesso!');
      setCardFlagsModal(false);
    } catch (error) {
      console.error('Erro ao salvar métodos de pagamento:', error);
      Alert.alert('Erro', 'Não foi possível salvar os métodos de pagamento. Tente novamente.');
    }
  };

  // Função para formatar hora no formato HH:MM
  const formatTimeInput = (input: string): string => {
    let digits = input.replace(/\D/g, '');
    if (digits.length > 4) digits = digits.slice(0, 4);
    if (digits.length <= 2) return digits;
    return digits.slice(0, 2) + ':' + digits.slice(2);
  };

  // Função para salvar horários de funcionamento
  const handleSaveSchedule = async () => {
    try {
      await establishmentSettingsService.saveSchedule(schedule);
      await onSettingsChange();
      Alert.alert('Sucesso', 'Horários atualizados com sucesso!');
      setScheduleModal(false);
    } catch (error) {
      console.error('Erro ao salvar horários:', error);
      Alert.alert('Erro', 'Não foi possível salvar os horários. Tente novamente.');
    }
  };

  // Função para atualizar horário de um dia específico
  const handleScheduleChange = (
    day: keyof Schedule,
    field: 'isOpen' | 'openTime' | 'closeTime',
    value: boolean | string
  ) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  return (
    <>
      {/* Modal de Horários */}
      <Modal
        visible={scheduleModal}
        animationType="slide"
        presentationStyle="fullScreen"
        transparent={false}
        onRequestClose={() => setScheduleModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Horários de Funcionamento</Text>
            <ScrollView style={styles.scrollView}>
              {Object.entries(schedule).map(([day, value]) => (
                <View key={day} style={styles.scheduleItem}>
                  <Text style={styles.dayLabel}>{day.charAt(0).toUpperCase() + day.slice(1)}</Text>
                  <Switch
                    value={value.isOpen}
                    onValueChange={(newValue) => handleScheduleChange(day as keyof Schedule, 'isOpen', newValue)}
                  />
                  {value.isOpen && (
                    <View style={styles.timeContainer}>
                      <TextInput
                        style={styles.timeInput}
                        value={value.openTime}
                        onChangeText={(text) => handleScheduleChange(day as keyof Schedule, 'openTime', formatTimeInput(text))}
                        placeholder="00:00"
                        keyboardType="numeric"
                        maxLength={5}
                      />
                      <Text style={styles.timeLabel}>até</Text>
                      <TextInput
                        style={styles.timeInput}
                        value={value.closeTime}
                        onChangeText={(text) => handleScheduleChange(day as keyof Schedule, 'closeTime', formatTimeInput(text))}
                        placeholder="00:00"
                        keyboardType="numeric"
                        maxLength={5}
                      />
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setScheduleModal(false)}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSaveSchedule}
              >
                <Text style={styles.buttonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal de Tempo de Entrega */}
      <Modal
        visible={deliveryTimeModal}
        animationType="slide"
        presentationStyle="fullScreen"
        transparent={false}
        onRequestClose={() => setDeliveryTimeModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tempo de Entrega</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Tempo mínimo (minutos):</Text>
              <TextInput
                style={styles.input}
                value={minDeliveryTime}
                onChangeText={setMinDeliveryTime}
                keyboardType="numeric"
                placeholder="20"
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Tempo máximo (minutos):</Text>
              <TextInput
                style={styles.input}
                value={maxDeliveryTime}
                onChangeText={setMaxDeliveryTime}
                keyboardType="numeric"
                placeholder="45"
              />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setDeliveryTimeModal(false)}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSaveDeliveryTime}
              >
                <Text style={styles.buttonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal de Métodos de Pagamento */}
      <Modal
        visible={cardFlagsModal}
        animationType="slide"
        presentationStyle="fullScreen"
        transparent={false}
        onRequestClose={() => setCardFlagsModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Métodos de Pagamento</Text>
            <ScrollView style={styles.scrollView}>
              {/* Dinheiro */}
              <View style={styles.paymentMethodItem}>
                <Text style={styles.methodLabel}>Dinheiro</Text>
                <Switch
                  value={paymentOptions.dinheiro.enabled}
                  onValueChange={(enabled) => handlePaymentMethodChange('dinheiro', enabled)}
                />
              </View>

              {/* PIX */}
              <View style={styles.paymentMethodItem}>
                <Text style={styles.methodLabel}>PIX</Text>
                <Switch
                  value={paymentOptions.pix.enabled}
                  onValueChange={(enabled) => handlePaymentMethodChange('pix', enabled)}
                />
              </View>

              {/* Cartão */}
              <View style={styles.paymentMethodItem}>
                <Text style={styles.methodLabel}>Cartão</Text>
                <Switch
                  value={paymentOptions.cartao.enabled}
                  onValueChange={(enabled) => handlePaymentMethodChange('cartao', enabled)}
                />
              </View>

              {/* Bandeiras de Cartão */}
              {paymentOptions.cartao.enabled && (
                <View style={styles.cardBrandsContainer}>
                  <Text style={styles.subTitle}>Bandeiras aceitas:</Text>
                  <View style={styles.cardBrandsList}>
                    <View style={styles.cardBrandItem}>
                      <Text style={styles.brandLabel}>Visa</Text>
                      <Switch
                        value={paymentOptions.cartao.brands.visa}
                        onValueChange={(enabled) => handleCardBrandChange('visa', enabled)}
                      />
                    </View>
                    <View style={styles.cardBrandItem}>
                      <Text style={styles.brandLabel}>Mastercard</Text>
                      <Switch
                        value={paymentOptions.cartao.brands.mastercard}
                        onValueChange={(enabled) => handleCardBrandChange('mastercard', enabled)}
                      />
                    </View>
                    <View style={styles.cardBrandItem}>
                      <Text style={styles.brandLabel}>Elo</Text>
                      <Switch
                        value={paymentOptions.cartao.brands.elo}
                        onValueChange={(enabled) => handleCardBrandChange('elo', enabled)}
                      />
                    </View>
                    <View style={styles.cardBrandItem}>
                      <Text style={styles.brandLabel}>American Express</Text>
                      <Switch
                        value={paymentOptions.cartao.brands.amex}
                        onValueChange={(enabled) => handleCardBrandChange('amex', enabled)}
                      />
                    </View>
                    <View style={styles.cardBrandItem}>
                      <Text style={styles.brandLabel}>Hipercard</Text>
                      <Switch
                        value={paymentOptions.cartao.brands.hipercard}
                        onValueChange={(enabled) => handleCardBrandChange('hipercard', enabled)}
                      />
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setCardFlagsModal(false)}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSavePaymentOptions}
              >
                <Text style={styles.buttonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal de Retirada */}
      <Modal
        visible={pickupModal}
        animationType="slide"
        presentationStyle="fullScreen"
        transparent={false}
        onRequestClose={() => setPickupModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Configurações de Retirada</Text>
            <View style={styles.pickupContainer}>
              <Text style={styles.label}>Permitir retirada:</Text>
              <Switch
                value={allowPickup}
                onValueChange={setAllowPickup}
              />
            </View>
            {allowPickup && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Tempo estimado (minutos):</Text>
                <TextInput
                  style={styles.input}
                  value={pickupTime}
                  onChangeText={setPickupTime}
                  keyboardType="numeric"
                  placeholder="15"
                />
              </View>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setPickupModal(false)}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSavePickupSettings}
              >
                <Text style={styles.buttonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal de Valor Mínimo do Pedido */}
      <Modal
        visible={minimumOrderModal}
        animationType="slide"
        presentationStyle="fullScreen"
        transparent={false}
        onRequestClose={() => setMinimumOrderModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Valor Mínimo do Pedido</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Valor mínimo para entrega:</Text>
              <TextInput
                style={styles.input}
                value={minimumOrderAmount}
                onChangeText={handleMinimumOrderChange}
                keyboardType="numeric"
                placeholder="R$ 0,00"
              />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setMinimumOrderModal(false)}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSaveMinimumOrderAmount}
              >
                <Text style={styles.buttonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal de Taxas de Entrega */}
      <Modal
        visible={deliveryFeesModal}
        animationType="slide"
        presentationStyle="fullScreen"
        transparent={false}
        onRequestClose={() => setDeliveryFeesModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Taxas de Entrega</Text>
            
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                Atenção: Bairros não editados permanecerão com taxa 0 (entrega gratuita).
              </Text>
            </View>

            {isLoadingFees ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.orange} />
                <Text style={styles.loadingText}>Carregando bairros...</Text>
              </View>
            ) : (
              <ScrollView style={styles.scrollView}>
                <View style={styles.feesList}>
                  {deliveryFees.map((fee) => (
                    <View key={fee.id} style={styles.feeCard}>
                      <View style={styles.feeHeader}>
                        <Text style={styles.neighborhoodName}>{fee.neighborhood}</Text>
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => handleEditFee(fee)}
                        >
                          <Feather name="more-vertical" size={18} color="#FF7700" />
                        </TouchableOpacity>
                      </View>
                      
                      <View style={styles.feeDisplay}>
                        <Text style={styles.currencySymbol}>R$</Text>
                        <Text style={styles.feeValue}>{formatToBRL(fee.fee)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setDeliveryFeesModal(false)}
              >
                <Text style={styles.buttonText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal para editar taxa */}
      <Modal
        transparent={true}
        visible={isEditFeeModalVisible}
        animationType="none"
        onRequestClose={handleCloseEditFeeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Taxa de Entrega</Text>
              <TouchableOpacity onPress={handleCloseEditFeeModal} style={styles.closeButton}>
                <Feather name="x" size={24} color={colors.gray[600]} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.neighborhoodTitle}>
                {editingFee?.neighborhood}
              </Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Valor da taxa</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputCurrency}>R$</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editingValue}
                    onChangeText={handleValueChange}
                    keyboardType="numeric"
                    placeholder="0,00"
                    placeholderTextColor={colors.gray[400]}
                  />
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={handleCloseEditFeeModal}
                  disabled={isSavingFee}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.saveButton]}
                  onPress={handleSaveFee}
                  disabled={isSavingFee}
                >
                  {isSavingFee ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.saveButtonText}>Salvar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 20,
    width: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  scrollView: {
    maxHeight: '70%',
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  saveButton: {
    backgroundColor: colors.orange,
  },
  buttonText: {
    color: '#FFF',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scheduleItem: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingBottom: 10,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 8,
    width: 80,
    textAlign: 'center',
  },
  timeLabel: {
    marginHorizontal: 10,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  methodLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  cardBrandsContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
  },
  cardBrandsList: {
    marginLeft: 15,
  },
  cardBrandItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  brandLabel: {
    fontSize: 14,
  },
  pickupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  formattedValue: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  // Estilos para taxas de entrega
  infoContainer: {
    backgroundColor: '#FFF0E6',
    borderWidth: 1,
    borderColor: '#FFCCA9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#FF7700',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.gray[600],
  },
  feesList: {
    gap: 12,
  },
  feeCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: colors.orange,
  },
  feeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  neighborhoodName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[800],
  },
  feeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 16,
    color: colors.gray[600],
    marginRight: 4,
  },
  feeValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[800],
  },
  editButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#FFF0E6',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  editModalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: colors.gray[100],
  },
  modalBody: {
    padding: 20,
  },
  neighborhoodTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[700],
    marginBottom: 20,
    textAlign: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputCurrency: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[600],
    marginRight: 8,
  },
  modalInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[800],
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[700],
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.white,
  },
});
