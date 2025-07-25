import React from 'react';
import { StyleSheet, View, Text, TextInput as RNTextInput } from 'react-native';
import { colors } from '../styles/theme/colors';

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
    <View style={styles.container}>
      <Text style={[styles.label, error && styles.labelError]}>{label}</Text>
      <RNTextInput
        style={[
          styles.input,
          error && styles.inputError,
          disabled && styles.inputDisabled
        ]}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        editable={!disabled}
        placeholder={placeholder}
        placeholderTextColor={colors.text.secondary}
        maxLength={maxLength}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  labelError: {
    color: colors.text.error,
  },
  input: {
    height: 56,
    backgroundColor: colors.inputBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text.primary,
  },
  inputError: {
    borderColor: colors.text.error,
    borderWidth: 2,
  },
  inputDisabled: {
    opacity: 0.6,
    backgroundColor: colors.gray[100],
  },
}); 