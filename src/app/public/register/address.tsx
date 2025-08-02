import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Dimensions, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { addressService } from '../../../services/addressService';
import { CustomInput } from '../../../components/CustomInput';
import { colors } from '../../../styles/theme/colors';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface State {
  id: string;
  name: string;
}

interface City {
  id: string;
  name: string;
  zip_code?: string;
}

interface Neighborhood {
  id: string;
  name: string;
}

interface AddressFormData {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  neighborhoodName: string;
  city: string;
  cityName: string;
  zip_code: string;
  state: string;
  stateName: string;
}

// Função para capitalizar a primeira letra de cada palavra
const capitalizeWords = (s: string): string => s.replace(/\b\w/g, c => c.toUpperCase());

// Dimensões da tela para responsividade
const { width: screenWidth } = Dimensions.get('window');

export default function RegisterAddress() {
  const router = useRouter();
  const rawParams = useLocalSearchParams();
  
  // Memoize params to prevent unnecessary re-renders
  const params = useMemo(() => rawParams, [JSON.stringify(rawParams)]);

  const [loading, setLoading] = useState(false);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [formData, setFormData] = useState<AddressFormData>({
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    neighborhoodName: '',
    city: '',
    cityName: '',
    zip_code: '',
    state: '',
    stateName: ''
  });
  const [errors, setErrors] = useState({
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
  });

  // Estados para controlar os modais dos pickers
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showNeighborhoodPicker, setShowNeighborhoodPicker] = useState(false);

  useEffect(() => {
    loadStates();
  }, []);

  useEffect(() => {
    if (formData.state) {
      loadCities(formData.state);
    }
  }, [formData.state]);

  useEffect(() => {
    if (formData.state && formData.city) {
      loadNeighborhoods(formData.state, formData.city);
    }
  }, [formData.state, formData.city]);

  const updateFormData = useCallback((field: Partial<AddressFormData>) => {
    setFormData(prev => ({
      ...prev,
      ...field
    }));
  }, []);

  const loadStates = async () => {
    try {
      setLoading(true);
      const statesData = await addressService.getStates();
      setStates(statesData);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os estados');
    } finally {
      setLoading(false);
    }
  };

  const loadCities = async (stateId: string) => {
    try {
      setLoading(true);
      const citiesData = await addressService.getCities(stateId);
      setCities(citiesData);
      updateFormData({ 
        city: '', 
        cityName: '',
        zip_code: '',
        neighborhood: '', 
        neighborhoodName: '' 
      });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar as cidades');
    } finally {
      setLoading(false);
    }
  };

  const loadNeighborhoods = async (stateId: string, cityId: string) => {
    try {
      setLoading(true);
      const neighborhoodsData = await addressService.getNeighborhoods(stateId, cityId);
      setNeighborhoods(neighborhoodsData);
      updateFormData({ 
        neighborhood: '',
        neighborhoodName: '' 
      });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os bairros');
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const newErrors = {
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
    };
    let isValid = true;

    if (!formData.street?.trim()) {
      newErrors.street = 'Rua é obrigatória';
      isValid = false;
    }
    if (!formData.number?.trim()) {
      newErrors.number = 'Número é obrigatório';
      isValid = false;
    }
    if (!formData.neighborhood) {
      newErrors.neighborhood = 'Bairro é obrigatório';
      isValid = false;
    }
    if (!formData.city) {
      newErrors.city = 'Cidade é obrigatória';
      isValid = false;
    }
    if (!formData.state) {
      newErrors.state = 'Estado é obrigatório';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (values: any) => {    
    const paramsToSend = {
      ...params,
      street: values.street,
      number: values.number,
      complement: values.complement || '',
      neighborhood: values.neighborhood,
      neighborhoodName: values.neighborhoodName,
      city: values.city,
      cityName: values.cityName,
      zip_code: values.zip_code,
      state: values.state,
      stateName: values.stateName
    };

    router.push({
      pathname: '/public/register/settings',
      params: paramsToSend
    });
  };

  const handleBack = () => {
    router.back();
  };

  const getSelectedStateName = () => {
    const selectedState = states.find(state => state.id === formData.state);
    return selectedState?.name || 'Selecione um estado';
  };

  const getSelectedCityName = () => {
    const selectedCity = cities.find(city => city.id === formData.city);
    return selectedCity?.name || 'Selecione uma cidade';
  };

  const getSelectedNeighborhoodName = () => {
    const selectedNeighborhood = neighborhoods.find(n => n.id === formData.neighborhood);
    return selectedNeighborhood?.name || 'Selecione um bairro';
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Seu Endereço</Text>
        <Text style={styles.subtitle}>Informe o endereço do seu estabelecimento</Text>

        <View style={styles.form}>
          {/* Estado */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Estado</Text>
            <TouchableOpacity
              style={[styles.pickerButton, errors.state && styles.pickerError]}
              onPress={() => setShowStatePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.pickerButtonText,
                !formData.state && styles.pickerButtonPlaceholder
              ]}>
                {getSelectedStateName()}
              </Text>
            </TouchableOpacity>
            {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}
          </View>

          {/* Cidade */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Cidade</Text>
            <TouchableOpacity
              style={[
                styles.pickerButton, 
                errors.city && styles.pickerError,
                !formData.state && styles.pickerButtonDisabled
              ]}
              onPress={() => formData.state && setShowCityPicker(true)}
              activeOpacity={0.7}
              disabled={!formData.state}
            >
              <Text style={[
                styles.pickerButtonText,
                !formData.city && styles.pickerButtonPlaceholder
              ]}>
                {getSelectedCityName()}
              </Text>
            </TouchableOpacity>
            {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
          </View>

          {/* Bairro */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Bairro</Text>
            <TouchableOpacity
              style={[
                styles.pickerButton, 
                errors.neighborhood && styles.pickerError,
                !formData.city && styles.pickerButtonDisabled
              ]}
              onPress={() => formData.city && setShowNeighborhoodPicker(true)}
              activeOpacity={0.7}
              disabled={!formData.city}
            >
              <Text style={[
                styles.pickerButtonText,
                !formData.neighborhood && styles.pickerButtonPlaceholder
              ]}>
                {getSelectedNeighborhoodName()}
              </Text>
            </TouchableOpacity>
            {errors.neighborhood && <Text style={styles.errorText}>{errors.neighborhood}</Text>}
          </View>

          {/* Rua com CustomInput */}
          <CustomInput
            label="Rua"
            value={formData.street}
            onChangeText={(text) => updateFormData({ street: capitalizeWords(text) })}
            error={!!errors.street}
            placeholder="Digite o nome da rua"
            autoCapitalize="words"
          />
          {errors.street && <Text style={styles.errorText}>{errors.street}</Text>}

          {/* Número com CustomInput */}
          <CustomInput
            label="Número"
            value={formData.number}
            onChangeText={(text) => updateFormData({ number: text })}
            error={!!errors.number}
            keyboardType="numeric"
            placeholder="Digite o número"
          />
          {errors.number && <Text style={styles.errorText}>{errors.number}</Text>}

          {/* Complemento com CustomInput */}
          <CustomInput
            label="Complemento (opcional)"
            value={formData.complement || ''}
            onChangeText={(text) => updateFormData({ complement: capitalizeWords(text) })}
            placeholder="Apartamento, bloco, etc"
            autoCapitalize="words"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={() => {
            if (validate()) {
              handleSubmit(formData);
            }
          }}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>Continuar</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.8}
        >
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal do Estado */}
      <Modal
        visible={showStatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecione o Estado</Text>
              <TouchableOpacity onPress={() => setShowStatePicker(false)}>
                <Text style={styles.modalCloseButton}>Fechar</Text>
              </TouchableOpacity>
            </View>
            <Picker
              selectedValue={formData.state}
              onValueChange={(itemValue) => {
                const selectedState = states.find(state => state.id === itemValue);
                updateFormData({ 
                  state: itemValue, 
                  stateName: selectedState?.name || '', 
                  city: '', 
                  cityName: '',
                  zip_code: '',
                  neighborhood: '', 
                  neighborhoodName: '' 
                });
                setShowStatePicker(false);
              }}
              style={styles.modalPicker}
            >
              <Picker.Item label="Selecione um estado" value="" />
              {states.map((state) => (
                <Picker.Item key={state.id} label={state.name} value={state.id} />
              ))}
            </Picker>
          </View>
        </View>
      </Modal>

      {/* Modal da Cidade */}
      <Modal
        visible={showCityPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCityPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecione a Cidade</Text>
              <TouchableOpacity onPress={() => setShowCityPicker(false)}>
                <Text style={styles.modalCloseButton}>Fechar</Text>
              </TouchableOpacity>
            </View>
            <Picker
              selectedValue={formData.city}
              onValueChange={(itemValue) => {
                const selectedCity = cities.find(city => city.id === itemValue);
                updateFormData({ 
                  city: itemValue, 
                  cityName: selectedCity?.name || '',
                  zip_code: selectedCity?.zip_code || '',
                  neighborhood: '', 
                  neighborhoodName: '' 
                });
                setShowCityPicker(false);
              }}
              style={styles.modalPicker}
            >
              <Picker.Item label="Selecione uma cidade" value="" />
              {cities.map((city) => (
                <Picker.Item key={city.id} label={city.name} value={city.id} />
              ))}
            </Picker>
          </View>
        </View>
      </Modal>

      {/* Modal do Bairro */}
      <Modal
        visible={showNeighborhoodPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowNeighborhoodPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecione o Bairro</Text>
              <TouchableOpacity onPress={() => setShowNeighborhoodPicker(false)}>
                <Text style={styles.modalCloseButton}>Fechar</Text>
              </TouchableOpacity>
            </View>
            <Picker
              selectedValue={formData.neighborhood}
              onValueChange={(itemValue) => {
                const selectedNeighborhood = neighborhoods.find(n => n.id === itemValue);
                updateFormData({ 
                  neighborhood: itemValue,
                  neighborhoodName: selectedNeighborhood?.name || '' 
                });
                setShowNeighborhoodPicker(false);
              }}
              style={styles.modalPicker}
            >
              <Picker.Item label="Selecione um bairro" value="" />
              {neighborhoods.map((neighborhood) => (
                <Picker.Item key={neighborhood.id} label={neighborhood.name} value={neighborhood.id} />
              ))}
            </Picker>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: Math.min(30, screenWidth * 0.08),
    paddingTop: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: Math.min(28, screenWidth * 0.07),
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Math.min(16, screenWidth * 0.04),
    color: colors.text.secondary,
    marginBottom: 30,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  pickerButton: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    backgroundColor: colors.inputBackground,
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  pickerButtonDisabled: {
    opacity: 0.5,
    backgroundColor: colors.gray[100],
  },
  pickerError: {
    borderColor: colors.text.error,
    borderWidth: 2,
  },
  pickerButtonText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  pickerButtonPlaceholder: {
    color: colors.text.secondary,
  },
  errorText: {
    color: colors.text.error,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
    marginLeft: 4,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  // Estilos dos modais
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  modalCloseButton: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
  },
  modalPicker: {
    height: 200,
  },
});