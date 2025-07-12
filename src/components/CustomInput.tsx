import React from 'react';
import { StyleSheet } from 'react-native';
import { TextInput } from 'react-native-paper';

interface CustomInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: (e: any) => void;
  error?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

export const CustomInput = ({
  label,
  value,
  onChangeText,
  onBlur,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  disabled = false,
  placeholder,
  maxLength,
}: CustomInputProps) => {
  return (
    <TextInput
      label={label}
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      onBlur={onBlur}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      autoCorrect={false}
      error={error}
      mode="flat"
      disabled={disabled}
      placeholder={placeholder}
      underlineColor="transparent"
      activeUnderlineColor="#FFA500"
      theme={{ colors: { background: '#F8F8F8' } }}
      maxLength={maxLength}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    height: 60,
    marginBottom: 16,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
  },
}); 