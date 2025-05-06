import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { colors } from '@/styles/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { deliveryFeeService, DeliveryFee } from '@/services/deliveryFeeService';
import { addressService } from '@/services/addressService';
import { establishmentService } from '@/services/establishmentService';
import { Feather } from '@expo/vector-icons';


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
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const handleUpdateFee = async (id: string, newValue: string) => {
    try {
      if (!user?.uid) return;
      
      // Converter o valor formatado para número
      const value = cleanFormat(newValue);
      if (isNaN(value) || value < 0) return;

      const fee = deliveryFees.find(f => f.id === id);
      if (!fee) return;

      // Se é uma taxa temporária e o valor é maior que 0, criar nova no banco
      if (id.startsWith('temp_') && value > 0) {
        const newFeeId = await deliveryFeeService.createDeliveryFee({
          neighborhood: fee.neighborhood,
          fee: value,
          storeId: user.uid
        });

        // Atualizar o estado local com o novo ID
        setDeliveryFees(prev =>
          prev.map(f => f.id === id ? { ...f, id: newFeeId, fee: value } : f)
        );
      } else if (!id.startsWith('temp_')) {
        // Atualizar taxa existente
        await deliveryFeeService.updateDeliveryFee(user.uid, id, {
          fee: value
        });

        setDeliveryFees(prev =>
          prev.map(f => f.id === id ? { ...f, fee: value } : f)
        );
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar o valor da taxa');
    }
  };

  const handleEditToggle = (id: string) => {
    setEditingId(editingId === id ? null : id);
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
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.green[500]} />
            <Text style={styles.loadingText}>Carregando taxas...</Text>
          </View>
        ) : (
          <View style={styles.feesList}>
            {deliveryFees.map((fee) => (
              <View key={fee.id} style={styles.feeCard}>
                <View style={styles.feeHeader}>
                  <Text style={styles.neighborhoodName}>{fee.neighborhood}</Text>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEditToggle(fee.id)}
                  >
                    <Feather 
                      name={editingId === fee.id ? "check" : "more-vertical"} 
                      size={18} 
                      color="#FF7700" 
                    />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.feeInputContainer}>
                  <Text style={styles.currencySymbol}>R$</Text>
                  <TextInput
                    style={[
                      styles.feeInput,
                      editingId !== fee.id && styles.feeInputDisabled
                    ]}
                    value={formatToBRL(fee.fee)}
                    onChangeText={(value) => handleUpdateFee(fee.id, value)}
                    keyboardType="numeric"
                    editable={editingId === fee.id}
                    placeholder="0,00"
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
  feeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 16,
    color: colors.gray[600],
    marginRight: 4,
  },
  feeInput: {
    flex: 1,
    fontSize: 16,
    color: colors.gray[800],
    padding: 8,
    backgroundColor: '#FFF0E6',
    borderRadius: 8,
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
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#FFF0E6',
  },
  feeInputDisabled: {
    backgroundColor: colors.gray[200],
    color: colors.gray[600],
  }
}); 