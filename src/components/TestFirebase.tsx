import React, { useState } from 'react';
import { View, Text, Button, TextInput, StyleSheet } from 'react-native';

export function TestFirebase() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState('');

  const handleTestRegister = async () => {
    try {
      setResult('Testando cadastro...');
      // Implementação futura
      setResult('Funcionalidade em desenvolvimento');
    } catch (error: any) {
      setResult('Erro no cadastro: ' + error.message);
    }
  };

  const handleTestLogin = async () => {
    try {
      setResult('Testando login...');
      // Implementação futura
      setResult('Funcionalidade em desenvolvimento');
    } catch (error: any) {
      setResult('Erro no login: ' + error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Teste Firebase</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <View style={styles.buttonContainer}>
        <Button title="Testar Cadastro" onPress={handleTestRegister} />
        <Button title="Testar Login" onPress={handleTestLogin} />
      </View>

      <Text style={styles.result}>{result}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20
  },
  result: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8
  }
}); 