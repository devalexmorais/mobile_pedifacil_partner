import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useRegisterForm } from './context';

export default function RegisterBasicInfo() {
  const router = useRouter();
  const { formData, updateFormData } = useRegisterForm();
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const validate = () => {
    const newErrors = {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    };
    // Validação do nome
    if (!formData.name?.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
    }
    // Validação do email
    if (!formData.email?.trim()) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'E-mail inválido';
    }
    // Validação da senha
    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 6) {
      newErrors.password = 'A senha deve ter pelo menos 6 caracteres';
    } else if (!/(?=.*[A-Z])/.test(formData.password)) {
      newErrors.password = 'A senha deve conter pelo menos uma letra maiúscula';
    } else if (!/(?=.*[0-9])/.test(formData.password)) {
      newErrors.password = 'A senha deve conter pelo menos um número';
    }
    // Validação da confirmação de senha
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirmação de senha é obrigatória';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }
    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const handleNext = () => {
    if (validate()) {
      router.push('/public/register/phone');
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Criar Conta</Text>
        <Text style={styles.subtitle}>Preencha seus dados básicos</Text>
      </View>
      <View style={styles.form}>
        {/* Nome */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Nome completo</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            placeholder="Digite seu nome completo"
            value={formData.name}
            onChangeText={(value) => updateFormData({ name: value })}
            autoCapitalize="words"
            returnKeyType="next"
          />
          {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
        </View>

        {/* E-mail */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            placeholder="Digite seu e-mail"
            keyboardType="email-address"
            autoCapitalize="none"
            value={formData.email}
            onChangeText={(value) => updateFormData({ email: value })}
            returnKeyType="next"
          />
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
        </View>

        {/* Senha */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Senha</Text>
          <TextInput
            style={[styles.input, errors.password && styles.inputError]}
            placeholder="Digite sua senha"
            secureTextEntry
            value={formData.password}
            onChangeText={(value) => updateFormData({ password: value })}
            returnKeyType="next"
          />
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
        </View>

        {/* Confirmação de Senha */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirme sua senha</Text>
          <TextInput
            style={[styles.input, errors.confirmPassword && styles.inputError]}
            placeholder="Digite sua senha novamente"
            secureTextEntry
            value={formData.confirmPassword}
            onChangeText={(value) => updateFormData({ confirmPassword: value })}
            returnKeyType="done"
            onSubmitEditing={handleNext}
          />
          {errors.confirmPassword ? (
            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
          ) : null}
        </View>

        {/* Botão Próximo */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleNext}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>Próximo</Text>
        </TouchableOpacity>

        {/* Botão Voltar */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 80, // Ajuste para evitar sobreposição no final
  },
  header: {
    marginTop: 40,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    flex: 1,
    gap: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#f5f5f5',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  button: {
    height: 50,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#666',
    fontSize: 14,
  },
});