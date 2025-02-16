import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useRegisterForm } from './context';

export default function RegisterPhone() {
  const router = useRouter();
  const { formData, updateFormData } = useRegisterForm();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({
    phone: '',
  });

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .slice(0, 11)
      .replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const validate = () => {
    const newErrors = {
      phone: '',
    };

    if (!formData.phone) {
      newErrors.phone = 'Telefone é obrigatório';
    } else {
      const numbers = formData.phone.replace(/\D/g, '');
      if (numbers.length !== 11) {
        newErrors.phone = 'Telefone inválido';
      }
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const handleNext = async () => {
    if (!validate()) return;

    try {
      setIsLoading(true);
      // Atualiza o número de telefone e vai para a próxima etapa
      updateFormData({ phone: formData.phone });
      router.push('address' as any);
    } catch (error) {
      console.error('Erro ao salvar telefone:', error);
      Alert.alert(
        'Erro',
        'Não foi possível salvar o número de telefone'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Número de Telefone</Text>
          <Text style={styles.subtitle}>Digite seu número de telefone</Text>
        </View>

        <View style={styles.form}>
          <View>
            <Text style={styles.label}>Telefone</Text>
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              placeholder="(00) 00000-0000"
              value={formData.phone}
              onChangeText={(value) => updateFormData({ phone: formatPhone(value) })}
              keyboardType="numeric"
            />
            {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.buttonSecondary]} 
              onPress={() => router.back()}
              disabled={isLoading}
            >
              <Text style={styles.buttonSecondaryText}>Voltar</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.button} 
              onPress={() => router.push('/public/register/verify-code' as any)}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Próximo</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    gap: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  button: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondaryText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});