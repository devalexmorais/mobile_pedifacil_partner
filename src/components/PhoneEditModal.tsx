import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TwilioService } from '../services/twilioService';

interface PhoneEditModalProps {
  isVisible: boolean;
  currentPhone: string;
  onSave: (newPhone: string) => Promise<void>;
  onCancel: () => void;
}

export function PhoneEditModal({ 
  isVisible, 
  currentPhone, 
  onSave, 
  onCancel 
}: PhoneEditModalProps) {
  const [step, setStep] = useState<'phone' | 'verification'>('phone');
  const [newPhone, setNewPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);

  const formatPhoneInput = (text: string) => {
    // Remove todos os caracteres não numéricos
    const digits = text.replace(/\D/g, '');
    
    // Formatar para (11) 99999-9999
    if (digits.length <= 2) {
      return `(${digits}`;
    } else if (digits.length <= 7) {
      return `(${digits.substring(0, 2)}) ${digits.substring(2)}`;
    } else if (digits.length <= 11) {
      return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
    } else {
      // Limita a 11 dígitos
      const truncated = digits.substring(0, 11);
      return `(${truncated.substring(0, 2)}) ${truncated.substring(2, 7)}-${truncated.substring(7)}`;
    }
  };

  const handleSendCode = async () => {
    if (!TwilioService.isValidPhoneNumber(newPhone)) {
      Alert.alert('Erro', 'Formato de telefone inválido. Use (11) 99999-9999');
      return;
    }

    try {
      setSendingCode(true);
      const response = await TwilioService.sendVerificationCodeDirect(newPhone);
      
      if (response.success) {
        setStep('verification');
        Alert.alert(
          'Código Enviado', 
          `Um código de verificação foi enviado para ${TwilioService.formatPhoneDisplay(newPhone)}.`
        );
      } else {
        throw new Error('Falha ao enviar código de verificação');
      }
    } catch (error: any) {
      console.error('Erro ao enviar código:', error);
      Alert.alert('Erro', 'Não foi possível enviar o código. Tente novamente.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      Alert.alert('Erro', 'Digite o código de 6 dígitos');
      return;
    }

    try {
      setLoading(true);
      const response = await TwilioService.verifyCodeDirect(newPhone, verificationCode);
      
      if (response.success && response.valid) {
        await onSave(newPhone);
        handleClose();
        Alert.alert('Sucesso', 'Telefone atualizado com sucesso!');
      } else {
        Alert.alert('Código Inválido', response.message || 'O código digitado está incorreto.');
      }
    } catch (error: any) {
      console.error('Erro ao verificar código:', error);
      Alert.alert('Erro', 'Não foi possível verificar o código. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setSendingCode(true);
      const response = await TwilioService.sendVerificationCodeDirect(newPhone);
      
      if (response.success) {
        Alert.alert(
          'Código Reenviado', 
          `Um novo código de verificação foi enviado para ${TwilioService.formatPhoneDisplay(newPhone)}.`
        );
      } else {
        throw new Error('Falha ao reenviar código');
      }
    } catch (error: any) {
      console.error('Erro ao reenviar código:', error);
      Alert.alert('Erro', 'Não foi possível reenviar o código. Tente novamente.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleClose = () => {
    setStep('phone');
    setNewPhone('');
    setVerificationCode('');
    setLoading(false);
    setSendingCode(false);
    onCancel();
  };

  const handleBack = () => {
    setStep('phone');
    setVerificationCode('');
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {step === 'phone' ? 'Editar Telefone' : 'Verificar Código'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalBody}>
            {step === 'phone' ? (
              <>
                <Text style={styles.modalLabel}>Telefone Atual:</Text>
                <Text style={styles.currentPhone}>{TwilioService.formatPhoneDisplay(currentPhone)}</Text>
                
                <Text style={styles.modalLabel}>Novo Telefone:</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newPhone}
                  onChangeText={(text) => setNewPhone(formatPhoneInput(text))}
                  placeholder="(11) 99999-9999"
                  keyboardType="phone-pad"
                  maxLength={15}
                />
                
                <Text style={styles.infoText}>
                  Um código de verificação será enviado para o novo número
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.modalLabel}>Código enviado para:</Text>
                <Text style={styles.phoneDisplay}>
                  {TwilioService.formatPhoneDisplay(newPhone)}
                </Text>
                
                <Text style={styles.modalLabel}>Código de Verificação:</Text>
                <TextInput
                  style={styles.modalInput}
                  value={verificationCode}
                  onChangeText={(text) => {
                    // Permite apenas números e limita a 6 dígitos
                    const digits = text.replace(/\D/g, '').substring(0, 6);
                    setVerificationCode(digits);
                  }}
                  placeholder="Digite o código de 6 dígitos"
                  keyboardType="numeric"
                  maxLength={6}
                />
                
                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleResendCode}
                  disabled={sendingCode}
                >
                  {sendingCode ? (
                    <ActivityIndicator size="small" color="#FFA500" />
                  ) : (
                    <Text style={styles.resendButtonText}>Reenviar Código</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
          
          <View style={styles.modalFooter}>
            {step === 'phone' ? (
              <>
                <TouchableOpacity onPress={handleClose} style={[styles.modalButton, styles.cancelButton]}>
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleSendCode} 
                  style={[styles.modalButton, styles.saveButton]}
                  disabled={sendingCode || !TwilioService.isValidPhoneNumber(newPhone)}
                >
                  {sendingCode ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Enviar Código</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity onPress={handleBack} style={[styles.modalButton, styles.cancelButton]}>
                  <Text style={styles.cancelButtonText}>Voltar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleVerifyCode} 
                  style={[styles.modalButton, styles.saveButton]}
                  disabled={loading || verificationCode.length !== 6}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Verificar</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  currentPhone: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  phoneDisplay: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f9f9f9',
    marginBottom: 15,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 10,
  },
  resendButtonText: {
    color: '#FFA500',
    fontSize: 14,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#FFA500',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
}); 