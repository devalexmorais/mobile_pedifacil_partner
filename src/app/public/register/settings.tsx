import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CustomInput } from '../../../components/CustomInput';
import { colors } from '../../../styles/theme/colors';
import { useRegisterForm } from './context';

interface PaymentOption {
  type: string;
  enabled: boolean;
  brands?: { [key: string]: boolean };
}

interface ScheduleDay {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

interface SettingsFormData {
  delivery: {
    maxTime: string;
    minTime: string;
    minimumOrderAmount: string;
  };
  pickup: {
    enabled: boolean;
    estimatedTime: string;
  };
  paymentOptions: {
    dinheiro: PaymentOption;
    pix: PaymentOption;
    cartao: PaymentOption;
  };
  schedule: {
    domingo: ScheduleDay;
    segunda: ScheduleDay;
    terca: ScheduleDay;
    quarta: ScheduleDay;
    quinta: ScheduleDay;
    sexta: ScheduleDay;
    sabado: ScheduleDay;
  };
}

// Funções para formatar apenas dígitos e horário HH:mm
const onlyDigits = (s: string): string => s.replace(/\D/g, '');
const formatTime = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return digits.substr(0, 2) + ':' + digits.substr(2);
  return digits.substr(0, 2) + ':' + digits.substr(2, 2);
};

export default function Settings() {
  const router = useRouter();
  const rawParams = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const { formData: contextData, updateFormData: updateContextData } = useRegisterForm();
  
  // Memoize params to prevent unnecessary re-renders
  const params = useMemo(() => rawParams, [JSON.stringify(rawParams)]);
  
  const [formData, setFormData] = useState<SettingsFormData>({
    delivery: contextData.delivery || {
      maxTime: '45',
      minTime: '20',
      minimumOrderAmount: '20',
    },
    pickup: contextData.pickup || {
      enabled: true,
      estimatedTime: '15',
    },
    paymentOptions: contextData.paymentOptions || {
      dinheiro: { type: 'Dinheiro', enabled: true },
      pix: { type: 'PIX', enabled: true },
      cartao: { 
        type: 'Cartão', 
        enabled: true,
        brands: {
          visa: true,
          mastercard: true,
          elo: true,
          amex: false,
          hipercard: false,
        }
      },
    },
    schedule: contextData.schedule || {
      domingo: { isOpen: false, openTime: '00:00', closeTime: '00:00' },
      segunda: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
      terca: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
      quarta: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
      quinta: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
      sexta: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
      sabado: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
    }
  });

  useEffect(() => {
    // Inicialização se necessário
  }, []);

  const updateDeliveryData = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      delivery: {
        ...prev.delivery,
        [field]: value
      }
    }));
  };

  const updatePickupData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      pickup: {
        ...prev.pickup,
        [field]: value
      }
    }));
  };

  const updatePaymentOption = (option: string, enabled: boolean) => {
    setFormData(prev => ({
      ...prev,
      paymentOptions: {
        ...prev.paymentOptions,
        [option]: {
          ...prev.paymentOptions[option as keyof typeof prev.paymentOptions],
          enabled
        }
      }
    }));
  };

  const updateCardBrand = (brand: string, enabled: boolean) => {
    setFormData(prev => ({
      ...prev,
      paymentOptions: {
        ...prev.paymentOptions,
        cartao: {
          ...prev.paymentOptions.cartao,
          brands: {
            ...prev.paymentOptions.cartao.brands,
            [brand]: enabled
          }
        }
      }
    }));
  };

  const updateSchedule = (day: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: {
          ...prev.schedule[day as keyof typeof prev.schedule],
          [field]: value
        }
      }
    }));
  };

  const validate = () => {
    const newErrors: {[key: string]: string} = {};
    let isValid = true;

    // Validação de entrega
    if (!formData.delivery.minTime) {
      newErrors.minTime = 'Tempo mínimo obrigatório';
      isValid = false;
    }

    if (!formData.delivery.maxTime) {
      newErrors.maxTime = 'Tempo máximo obrigatório';
      isValid = false;
    }

    if (!formData.delivery.minimumOrderAmount) {
      newErrors.minimumOrderAmount = 'Valor mínimo obrigatório';
      isValid = false;
    }

    // Validação de retirada
    if (formData.pickup.enabled && !formData.pickup.estimatedTime) {
      newErrors.estimatedTime = 'Tempo estimado obrigatório';
      isValid = false;
    }

    // Verificar se pelo menos uma forma de pagamento está habilitada
    const hasEnabledPayment = Object.values(formData.paymentOptions).some(option => option.enabled);
    if (!hasEnabledPayment) {
      newErrors.paymentOptions = 'Selecione pelo menos uma forma de pagamento';
      isValid = false;
    }

    // Se cartão estiver habilitado, pelo menos uma bandeira deve estar selecionada
    if (formData.paymentOptions.cartao.enabled) {
      const hasEnabledBrand = Object.values(formData.paymentOptions.cartao.brands || {}).some(enabled => enabled);
      if (!hasEnabledBrand) {
        newErrors.cardBrands = 'Selecione pelo menos uma bandeira de cartão';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = () => {
    if (!validate()) {
      Alert.alert('Erro', 'Por favor, corrija os erros antes de continuar.');
      return;
    }

    // Atualizar o contexto com os dados do formulário
    updateContextData({
      delivery: formData.delivery,
      pickup: formData.pickup,
      paymentOptions: formData.paymentOptions,
      schedule: formData.schedule
    });

    // Prepara os parâmetros a serem enviados
    const paramsToSend = {
      ...params,
      delivery: JSON.stringify(formData.delivery),
      pickup: JSON.stringify(formData.pickup),
      paymentOptions: JSON.stringify(formData.paymentOptions),
      schedule: JSON.stringify(formData.schedule)
    };

    router.push({
      pathname: '/public/register/documents',
      params: paramsToSend
    });
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Configurações do Estabelecimento</Text>
        <Text style={styles.subtitle}>Configure como seu estabelecimento vai funcionar</Text>

        {/* Seção de Entrega */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Entrega</Text>
          
          <CustomInput
            label="Tempo mínimo de entrega (minutos)"
            value={formData.delivery.minTime}
            onChangeText={(text) => updateDeliveryData('minTime', onlyDigits(text))}
            keyboardType="numeric"
            error={!!errors.minTime}
          />
          {errors.minTime && <Text style={styles.errorText}>{errors.minTime}</Text>}

          <CustomInput
            label="Tempo máximo de entrega (minutos)"
            value={formData.delivery.maxTime}
            onChangeText={(text) => updateDeliveryData('maxTime', onlyDigits(text))}
            keyboardType="numeric"
            error={!!errors.maxTime}
          />
          {errors.maxTime && <Text style={styles.errorText}>{errors.maxTime}</Text>}

          <CustomInput
            label="Valor mínimo do pedido (R$)"
            value={formData.delivery.minimumOrderAmount}
            onChangeText={(text) => updateDeliveryData('minimumOrderAmount', onlyDigits(text))}
            keyboardType="numeric"
            error={!!errors.minimumOrderAmount}
          />
          {errors.minimumOrderAmount && <Text style={styles.errorText}>{errors.minimumOrderAmount}</Text>}
        </View>

        {/* Seção de Retirada */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Retirada no Local</Text>
          
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Permitir retirada no local</Text>
            <Switch
              value={formData.pickup.enabled}
              onValueChange={(value) => updatePickupData('enabled', value)}
              trackColor={{ false: '#d9d9d9', true: colors.primary }}
            />
          </View>

          {formData.pickup.enabled && (
            <>
              <CustomInput
                label="Tempo estimado para retirada (minutos)"
                value={formData.pickup.estimatedTime}
                onChangeText={(text) => updatePickupData('estimatedTime', onlyDigits(text))}
                keyboardType="numeric"
                error={!!errors.estimatedTime}
              />
              {errors.estimatedTime && <Text style={styles.errorText}>{errors.estimatedTime}</Text>}
            </>
          )}
        </View>

        {/* Seção de Formas de Pagamento */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Formas de Pagamento</Text>
          {errors.paymentOptions && <Text style={styles.errorText}>{errors.paymentOptions}</Text>}
          
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Dinheiro</Text>
            <Switch
              value={formData.paymentOptions.dinheiro.enabled}
              onValueChange={(value) => updatePaymentOption('dinheiro', value)}
              trackColor={{ false: '#d9d9d9', true: colors.primary }}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>PIX</Text>
            <Switch
              value={formData.paymentOptions.pix.enabled}
              onValueChange={(value) => updatePaymentOption('pix', value)}
              trackColor={{ false: '#d9d9d9', true: colors.primary }}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Cartão</Text>
            <Switch
              value={formData.paymentOptions.cartao.enabled}
              onValueChange={(value) => updatePaymentOption('cartao', value)}
              trackColor={{ false: '#d9d9d9', true: colors.primary }}
            />
          </View>

          {formData.paymentOptions.cartao.enabled && (
            <View style={styles.cardBrandsContainer}>
              <Text style={styles.cardBrandsTitle}>Bandeiras aceitas:</Text>
              {errors.cardBrands && <Text style={styles.errorText}>{errors.cardBrands}</Text>}
              
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Visa</Text>
                <Switch
                  value={formData.paymentOptions.cartao.brands?.visa}
                  onValueChange={(value) => updateCardBrand('visa', value)}
                  trackColor={{ false: '#d9d9d9', true: colors.primary }}
                />
              </View>
              
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Mastercard</Text>
                <Switch
                  value={formData.paymentOptions.cartao.brands?.mastercard}
                  onValueChange={(value) => updateCardBrand('mastercard', value)}
                  trackColor={{ false: '#d9d9d9', true: colors.primary }}
                />
              </View>
              
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Elo</Text>
                <Switch
                  value={formData.paymentOptions.cartao.brands?.elo}
                  onValueChange={(value) => updateCardBrand('elo', value)}
                  trackColor={{ false: '#d9d9d9', true: colors.primary }}
                />
              </View>
              
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>American Express</Text>
                <Switch
                  value={formData.paymentOptions.cartao.brands?.amex}
                  onValueChange={(value) => updateCardBrand('amex', value)}
                  trackColor={{ false: '#d9d9d9', true: colors.primary }}
                />
              </View>
              
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Hipercard</Text>
                <Switch
                  value={formData.paymentOptions.cartao.brands?.hipercard}
                  onValueChange={(value) => updateCardBrand('hipercard', value)}
                  trackColor={{ false: '#d9d9d9', true: colors.primary }}
                />
              </View>
            </View>
          )}
        </View>

        {/* Seção de Horários */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Horário de Funcionamento</Text>
          
          {['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'].map((day) => {
            const dayName = {
              domingo: 'Domingo',
              segunda: 'Segunda-feira',
              terca: 'Terça-feira',
              quarta: 'Quarta-feira',
              quinta: 'Quinta-feira',
              sexta: 'Sexta-feira',
              sabado: 'Sábado'
            }[day];

            const currentDay = formData.schedule[day as keyof typeof formData.schedule];

            return (
              <View key={day} style={styles.dayContainer}>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>{dayName}</Text>
                  <Switch
                    value={currentDay.isOpen}
                    onValueChange={(value) => updateSchedule(day, 'isOpen', value)}
                    trackColor={{ false: '#d9d9d9', true: colors.primary }}
                  />
                </View>

                {currentDay.isOpen && (
                  <View style={styles.timeContainer}>
                    <View style={styles.timeInput}>
                      <Text style={styles.timeLabel}>Abertura:</Text>
                      <CustomInput
                        label="Horário de abertura"
                        value={currentDay.openTime}
                        onChangeText={(text) => updateSchedule(day, 'openTime', formatTime(text))}
                        keyboardType="numeric"
                        placeholder="00:00"
                      />
                    </View>
                    
                    <View style={styles.timeInput}>
                      <Text style={styles.timeLabel}>Fechamento:</Text>
                      <CustomInput
                        label="Horário de fechamento"
                        value={currentDay.closeTime}
                        onChangeText={(text) => updateSchedule(day, 'closeTime', formatTime(text))}
                        keyboardType="numeric"
                        placeholder="00:00"
                      />
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Continuar</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
        >
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    padding: 30,
    paddingTop: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 30,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  switchLabel: {
    fontSize: 16,
    color: colors.text.primary,
  },
  cardBrandsContainer: {
    marginTop: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  cardBrandsTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 8,
  },
  dayContainer: {
    marginBottom: 16,
  },
  timeContainer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 16,
  },
  timeInput: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  errorText: {
    color: colors.text.error,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  button: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  backButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.text.secondary,
  },
  backButtonText: {
    color: colors.text.secondary,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
}); 