import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { addressService } from '../../../services/addressService';
import { CustomInput } from '../../../components/CustomInput';
import { colors } from '../../../styles/theme/colors';

interface State {
  id: string;
  name: string;
}

interface City {
  id: string;
  name: string;
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
  state: string;
  stateName: string;
}

export default function RegisterAddress() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Log inicial para ver os parâmetros recebidos
  console.log('Parâmetros recebidos ao montar o componente:', params);

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

  const updateFormData = (field: Partial<AddressFormData>) => {
    setFormData(prev => ({
      ...prev,
      ...field
    }));
  };

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
    // Logs para debug dos dados
    console.log('Valores do formulário:', values);
    console.log('Parâmetros atuais:', params);

    const paramsToSend = {
      ...params, // Usando a variável params definida no escopo do componente
      street: values.street,
      number: values.number,
      complement: values.complement || '',
      neighborhood: values.neighborhood,
      neighborhoodName: values.neighborhoodName,
      city: values.city,
      cityName: values.cityName,
      state: values.state,
      stateName: values.stateName
    };

    // Log dos parâmetros finais que serão enviados
    console.log('Parâmetros que serão enviados:', paramsToSend);

    router.push({
      pathname: '/public/register/documents',
      params: paramsToSend
    });
  };

  const handleBack = () => {
    router.back();
  };

  const handleRetry = () => {
    loadStates();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007aff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Seu Endereço</Text>
        <Text style={styles.subtitle}>Informe o endereço do seu estabelecimento</Text>

        <View style={styles.form}>
          {/* Estado */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Estado</Text>
            <View style={[styles.pickerContainer, errors.state && styles.pickerError]}>
              <Picker
                selectedValue={formData.state}
                onValueChange={(itemValue) => {
                  const selectedState = states.find(state => state.id === itemValue);
                  updateFormData({ 
                    state: itemValue, 
                    stateName: selectedState?.name || '', 
                    city: '', 
                    cityName: '',
                    neighborhood: '', 
                    neighborhoodName: '' 
                  });
                }}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                <Picker.Item label="Selecione um estado" value="" />
                {states.map((state) => (
                  <Picker.Item key={state.id} label={state.name} value={state.id} />
                ))}
              </Picker>
            </View>
            {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}
          </View>

          {/* Cidade */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Cidade</Text>
            <View style={[styles.pickerContainer, errors.city && styles.pickerError]}>
              <Picker
                selectedValue={formData.city}
                onValueChange={(itemValue) => {
                  const selectedCity = cities.find(city => city.id === itemValue);
                  updateFormData({ 
                    city: itemValue, 
                    cityName: selectedCity?.name || '',
                    neighborhood: '', 
                    neighborhoodName: '' 
                  });
                }}
                style={styles.picker}
                enabled={!!formData.state}
                itemStyle={styles.pickerItem}
              >
                <Picker.Item label="Selecione uma cidade" value="" />
                {cities.map((city) => (
                  <Picker.Item key={city.id} label={city.name} value={city.id} />
                ))}
              </Picker>
            </View>
            {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
          </View>

          {/* Bairro */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Bairro</Text>
            <View style={[styles.pickerContainer, errors.neighborhood && styles.pickerError]}>
              <Picker
                selectedValue={formData.neighborhood}
                onValueChange={(itemValue) => {
                  const selectedNeighborhood = neighborhoods.find(n => n.id === itemValue);
                  updateFormData({ 
                    neighborhood: itemValue,
                    neighborhoodName: selectedNeighborhood?.name || '' 
                  });
                }}
                style={styles.picker}
                enabled={!!formData.city}
                itemStyle={styles.pickerItem}
              >
                <Picker.Item label="Selecione um bairro" value="" />
                {neighborhoods.map((neighborhood) => (
                  <Picker.Item key={neighborhood.id} label={neighborhood.name} value={neighborhood.id} />
                ))}
              </Picker>
            </View>
            {errors.neighborhood && <Text style={styles.errorText}>{errors.neighborhood}</Text>}
          </View>

          {/* Rua com CustomInput */}
          <CustomInput
            label="Rua"
            value={formData.street}
            onChangeText={(text) => updateFormData({ street: text })}
            error={!!errors.street}
            placeholder="Digite o nome da rua"
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
            onChangeText={(text) => updateFormData({ complement: text })}
            placeholder="Apartamento, bloco, etc"
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
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    backgroundColor: colors.inputBackground,
    height: 65,
    justifyContent: 'center',
    paddingHorizontal: 8,
    overflow: 'hidden',
    paddingVertical: 4,
  },
  pickerError: {
    borderColor: colors.text.error,
  },
  picker: {
    height: 55,
    color: colors.text.primary,
    marginLeft: -8,
    width: '100%',
    fontSize: 16,
  },
  pickerItem: {
    fontSize: 16,
    height: 120,
    paddingVertical: 8,
  },
  errorText: {
    color: colors.text.error,
    fontSize: 12,
    marginTop: -12,
    marginBottom: 12,
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
    backgroundColor: '#fff',
  },
});