import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useRegisterForm } from './context';
import { locationService, State, City, District } from '../../../services/locationService';
import { Picker } from '@react-native-picker/picker';
import { addressService } from '../../../services/addressService';

export default function RegisterAddress() {
  const router = useRouter();
  const { formData, updateFormData } = useRegisterForm();
  const [loading, setLoading] = useState(false);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [neighborhoods, setNeighborhoods] = useState([]);
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

  const loadStates = async () => {
    try {
      setLoading(true);
      const statesData = await addressService.getStates();
      setStates(statesData);
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCities = async (stateId: string) => {
    try {
      setLoading(true);
      const citiesData = await addressService.getCities(stateId);
      setCities(citiesData);
      updateFormData({ city: '', neighborhood: '' });
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadNeighborhoods = async (stateId: string, cityId: string) => {
    try {
      setLoading(true);
      const neighborhoodsData = await addressService.getNeighborhoods(stateId, cityId);
      setNeighborhoods(neighborhoodsData);
      updateFormData({ neighborhood: '' });
    } catch (error: any) {
      Alert.alert('Erro', error.message);
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

  const handleNext = () => {
    if (validate()) {
      router.push('/public/register/documents');
    }
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Endereço</Text>
      <Text style={styles.subtitle}>Informe o endereço do seu estabelecimento</Text>

      {/* Estado */}
      <Text style={styles.label}>Estado *</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={formData.state}
          onValueChange={(itemValue) => {
            updateFormData({
              state: itemValue,
              city: '',
              neighborhood: '',
            });
          }}
          style={styles.picker}
        >
          <Picker.Item label="Selecione um estado" value="" />
          {states.map((state) => (
            <Picker.Item key={state.id} label={state.name} value={state.id} />
          ))}
        </Picker>
      </View>
      {errors.state ? <Text style={styles.errorText}>{errors.state}</Text> : null}

      {/* Cidade */}
      <Text style={styles.label}>Cidade *</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={formData.city}
          onValueChange={(itemValue) => {
            updateFormData({
              city: itemValue,
              neighborhood: '',
            });
          }}
          style={styles.picker}
          enabled={!!formData.state}
        >
          <Picker.Item label="Selecione uma cidade" value="" />
          {cities.map((city) => (
            <Picker.Item key={city.id} label={city.name} value={city.id} />
          ))}
        </Picker>
      </View>
      {errors.city ? <Text style={styles.errorText}>{errors.city}</Text> : null}

      {/* Bairro */}
      <Text style={styles.label}>Bairro *</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={formData.neighborhood}
          onValueChange={(itemValue) => {
            updateFormData({ neighborhood: itemValue });
          }}
          style={styles.picker}
          enabled={!!formData.city}
        >
          <Picker.Item label="Selecione um bairro" value="" />
          {neighborhoods.map((neighborhood) => (
            <Picker.Item key={neighborhood.id} label={neighborhood.name} value={neighborhood.id} />
          ))}
        </Picker>
      </View>
      {errors.neighborhood ? <Text style={styles.errorText}>{errors.neighborhood}</Text> : null}

      {/* Rua */}
      <Text style={styles.label}>Rua *</Text>
      <TextInput
        style={[styles.input, errors.street && styles.inputError]}
        placeholder="Rua"
        value={formData.street}
        onChangeText={(text) => updateFormData({ street: text })}
      />
      {errors.street ? <Text style={styles.errorText}>{errors.street}</Text> : null}

      {/* Número */}
      <Text style={styles.label}>Número *</Text>
      <TextInput
        style={[styles.input, errors.number && styles.inputError]}
        placeholder="Número"
        value={formData.number}
        onChangeText={(text) => updateFormData({ number: text })}
        keyboardType="numeric"
      />
      {errors.number ? <Text style={styles.errorText}>{errors.number}</Text> : null}

      {/* Complemento (opcional) */}
      <Text style={styles.label}>Complemento (opcional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Complemento"
        value={formData.complement}
        onChangeText={(text) => updateFormData({ complement: text })}
      />

      {/* Botões */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Próximo</Text>
        </TouchableOpacity>
      </View>

      {/* Tentar Novamente */}
      {states.length === 0 && !loading && (
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Tentar Novamente</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 12,
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007aff',
    marginRight: 8,
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#007aff',
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  backButtonText: {
    color: '#007aff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#007aff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});