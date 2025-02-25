import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, Switch, ActivityIndicator } from 'react-native';
import { colors } from '@/styles/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { deliveryFeeService, DeliveryFee } from '@/services/deliveryFeeService';
import { addressService } from '@/services/addressService';

interface Neighborhood {
  id: string;
  name: string;
}

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

  useEffect(() => {
    loadInitialData();
  }, [user]);

  const loadInitialData = async () => {
    try {
      if (!user?.uid) return;
      setIsLoading(true);

      // Carregar todos os bairros
      const allNeighborhoods = await addressService.getAllNeighborhoods();

      // Carregar taxas existentes
      const existingFees = await deliveryFeeService.getAllDeliveryFees(user.uid);
      
      // Criar um mapa de taxas existentes por bairro
      const feesByNeighborhood = new Map(
        existingFees.map(fee => [fee.neighborhood.toLowerCase(), fee])
      );

      // Criar lista final de taxas, incluindo bairros sem taxa (com valor 0)
      const allFees = allNeighborhoods.map(neighborhood => {
        const existingFee = feesByNeighborhood.get(neighborhood.name.toLowerCase());
        if (existingFee) {
          return existingFee;
        }
        return {
          id: `temp_${neighborhood.id}`,
          neighborhood: neighborhood.name,
          fee: 0,
          isActive: false,
          storeId: user.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      });

      // Ordenar por nome do bairro
      allFees.sort((a, b) => a.neighborhood.localeCompare(b.neighborhood));

      setDeliveryFees(allFees);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os dados');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      if (!user?.uid) return;
      const fee = deliveryFees.find(f => f.id === id);
      if (!fee) return;

      // Se é uma taxa temporária, criar nova no banco
      if (id.startsWith('temp_')) {
        const newFeeId = await deliveryFeeService.createDeliveryFee({
          neighborhood: fee.neighborhood,
          fee: fee.fee,
          isActive: true,
          storeId: user.uid
        });

        // Atualizar o estado local com o novo ID
        setDeliveryFees(prev =>
          prev.map(f => f.id === id ? { ...f, id: newFeeId, isActive: true } : f)
        );
      } else {
        // Atualizar taxa existente
        await deliveryFeeService.updateDeliveryFee(user.uid, id, {
          isActive: !fee.isActive
        });

        setDeliveryFees(prev =>
          prev.map(f => f.id === id ? { ...f, isActive: !f.isActive } : f)
        );
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar o status da taxa');
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
          isActive: true,
          storeId: user.uid
        });

        // Atualizar o estado local com o novo ID
        setDeliveryFees(prev =>
          prev.map(f => f.id === id ? { ...f, id: newFeeId, fee: value, isActive: true } : f)
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

  const formatInputValue = (value: string) => {
    const numericValue = value.replace(/[^\d]/g, '');
    const floatValue = parseFloat(numericValue) / 100;
    if (isNaN(floatValue)) return '';
    return formatToBRL(floatValue);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Taxas de Entrega</Text>
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
                  <Switch
                    value={fee.isActive}
                    onValueChange={() => handleToggleActive(fee.id)}
                    trackColor={{ false: colors.gray[300], true: colors.green[500] }}
                    thumbColor={colors.white}
                  />
                </View>
                
                <View style={styles.feeInputContainer}>
                  <Text style={styles.currencySymbol}>R$</Text>
                  <TextInput
                    style={[
                      styles.feeInput,
                      !fee.isActive && styles.feeInputDisabled
                    ]}
                    value={formatToBRL(fee.fee)}
                    onChangeText={(value) => handleUpdateFee(fee.id, value)}
                    keyboardType="numeric"
                    editable={true}
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
    backgroundColor: colors.gray[100],
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.gray[800],
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
    backgroundColor: colors.gray[100],
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
  feeInputDisabled: {
    backgroundColor: colors.gray[200],
    color: colors.gray[500],
  },
}); 