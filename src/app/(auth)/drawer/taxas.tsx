import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, ActivityIndicator, TouchableOpacity, Modal, Animated } from 'react-native';
import { colors } from '@/styles/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { deliveryFeeService, DeliveryFee } from '@/services/deliveryFeeService';
import { addressService } from '@/services/addressService';
import { establishmentService } from '@/services/establishmentService';
import { Feather } from '@expo/vector-icons';
import { LoadingSpinner } from '@/components';


// Função para formatar valor para BRL
const formatToBRL = (value: number): string => {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Função para limpar formatação e converter para número
const cleanFormat = (value: string): number => {
  const cleanValue = value.replace(/[^\d]/g, '');
  return parseFloat(cleanValue) / 100;
};

export default function TaxasEntrega() {
  const { user } = useAuth();
  const [deliveryFees, setDeliveryFees] = useState<DeliveryFee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storeCity, setStoreCity] = useState<string | null>(null);
  const [storeState, setStoreState] = useState<string | null>(null);
  
  // Modal states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingFee, setEditingFee] = useState<DeliveryFee | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [modalAnimation] = useState(new Animated.Value(0));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, [user]);

  const loadInitialData = async () => {
    try {
      if (!user?.uid) return;
      setIsLoading(true);

      // Obter dados do estabelecimento para identificar a cidade
      const partnerData = await establishmentService.getPartnerData();
      if (!partnerData || !partnerData.address) {
        Alert.alert('Erro', 'Não foi possível obter os dados do estabelecimento');
        setIsLoading(false);
        return;
      }

      const storeStateId = partnerData.address.state;
      const storeCityId = partnerData.address.city;
      
      setStoreState(storeStateId);
      setStoreCity(storeCityId);

      // Carregar os bairros apenas da cidade do estabelecimento
      const neighborhoodsFromCity = await addressService.getNeighborhoods(storeStateId, storeCityId);

      // Carregar taxas existentes
      const existingFees = await deliveryFeeService.getAllDeliveryFees(user.uid);
      
      // Criar um mapa de taxas existentes por bairro
      const feesByNeighborhood = new Map(
        existingFees.map(fee => [fee.neighborhood.toLowerCase(), fee])
      );

      // Criar lista final de taxas, incluindo bairros sem taxa (com valor 0)
      const allFees: DeliveryFee[] = neighborhoodsFromCity.map(neighborhood => {
        const existingFee = feesByNeighborhood.get(neighborhood.name.toLowerCase());
        if (existingFee) {
          return existingFee;
        }
        
        // Criar uma taxa temporária com o formato correto da interface DeliveryFee
        return {
          id: `temp_${neighborhood.id}`,
          neighborhood: neighborhood.name,
          fee: 0,
          storeId: user.uid,
          createdAt: "2025-05-06T23:28:21.833Z",
          updatedAt: new Date().toISOString()
        };
      });

      // Ordenar por nome do bairro
      allFees.sort((a, b) => a.neighborhood.localeCompare(b.neighborhood));

      setDeliveryFees(allFees);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditFee = (fee: DeliveryFee) => {
    setEditingFee(fee);
    setEditingValue(formatToBRL(fee.fee));
    setIsModalVisible(true);
    
    // Animate modal appearance
    Animated.spring(modalAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const handleCloseModal = () => {
    Animated.timing(modalAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setIsModalVisible(false);
      setEditingFee(null);
      setEditingValue('');
    });
  };

  const handleSaveFee = async () => {
    if (!editingFee || !user?.uid) return;

    try {
      setIsSaving(true);
      
      // Converter o valor formatado para número
      const value = cleanFormat(editingValue);
      if (isNaN(value) || value < 0) {
        Alert.alert('Erro', 'Por favor, insira um valor válido');
        return;
      }

      // Se é uma taxa temporária e o valor é maior que 0, criar nova no banco
      if (editingFee.id.startsWith('temp_') && value > 0) {
        const newFeeId = await deliveryFeeService.createDeliveryFee({
          neighborhood: editingFee.neighborhood,
          fee: value,
          storeId: user.uid
        });

        // Atualizar o estado local com o novo ID
        setDeliveryFees(prev =>
          prev.map(f => f.id === editingFee.id ? { ...f, id: newFeeId, fee: value } : f)
        );
      } else if (!editingFee.id.startsWith('temp_')) {
        // Atualizar taxa existente
        await deliveryFeeService.updateDeliveryFee(user.uid, editingFee.id, {
          fee: value
        });

        setDeliveryFees(prev =>
          prev.map(f => f.id === editingFee.id ? { ...f, fee: value } : f)
        );
      }

      handleCloseModal();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar a taxa de entrega');
    } finally {
      setIsSaving(false);
    }
  };

  const formatInputValue = (value: string) => {
    // Remove todos os caracteres não numéricos
    const cleanValue = value.replace(/\D/g, '');
    
    // Converte para número e divide por 100 para ter centavos
    const numericValue = parseInt(cleanValue, 10) / 100;
    
    // Formata como moeda brasileira
    return numericValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleValueChange = (value: string) => {
    const formatted = formatInputValue(value);
    setEditingValue(formatted);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Atenção: Bairros não editados permanecerão com taxa 0 (entrega gratuita).
          </Text>
        </View>

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <View style={styles.feesList}>
            {deliveryFees.map((fee) => (
              <View key={fee.id} style={styles.feeCard}>
                <View style={styles.feeHeader}>
                  <Text style={styles.neighborhoodName}>{fee.neighborhood}</Text>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEditFee(fee)}
                  >
                    <Feather name="more-vertical" size={18} color="#FF7700" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.feeDisplay}>
                  <Text style={styles.currencySymbol}>R$</Text>
                  <Text style={styles.feeValue}>{formatToBRL(fee.fee)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal para editar taxa */}
      <Modal
        transparent={true}
        visible={isModalVisible}
        animationType="none"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [
                  {
                    scale: modalAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
                opacity: modalAnimation,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Taxa de Entrega</Text>
              <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
                <Feather name="x" size={24} color={colors.gray[600]} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.neighborhoodTitle}>
                {editingFee?.neighborhood}
              </Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Valor da taxa</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputCurrency}>R$</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editingValue}
                    onChangeText={handleValueChange}
                    keyboardType="numeric"
                    placeholder="0,00"
                    placeholderTextColor={colors.gray[400]}
                  />
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={handleCloseModal}
                  disabled={isSaving}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.saveButton]}
                  onPress={handleSaveFee}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.saveButtonText}>Salvar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
  },
  infoContainer: {
    backgroundColor: '#FFF0E6',
    borderWidth: 1,
    borderColor: '#FFCCA9',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#FF7700',
    textAlign: 'center',
  },
  feesList: {
    padding: 16,
    gap: 12,
  },
  feeCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: colors.orange,
  },
  feeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  neighborhoodName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[800],
  },
  feeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 16,
    color: colors.gray[600],
    marginRight: 4,
  },
  feeValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[800],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.gray[600],
  },
  editButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#FFF0E6',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[800],
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: colors.gray[100],
  },
  modalBody: {
    padding: 20,
  },
  neighborhoodTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[700],
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray[700],
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputCurrency: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[600],
    marginRight: 8,
  },
  modalInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[800],
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  cancelButton: {
    backgroundColor: colors.gray[100],
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[700],
  },
  saveButton: {
    backgroundColor: '#FF7700',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.white,
  },
}); 