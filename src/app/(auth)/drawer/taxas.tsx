import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Switch } from 'react-native';
import { colors } from '@/styles/theme/colors';
import { Ionicons } from '@expo/vector-icons';

interface DeliveryFee {
  id: string;
  neighborhood: string;
  fee: number;
  isActive: boolean;
}

export default function TaxasEntrega() {
  const [deliveryFees, setDeliveryFees] = useState<DeliveryFee[]>([
    { id: '1', neighborhood: 'Centro', fee: 5, isActive: true },
    { id: '2', neighborhood: 'Jardim América', fee: 7, isActive: true },
    { id: '3', neighborhood: 'Vila Nova', fee: 8, isActive: true },
  ]);

  const [newNeighborhood, setNewNeighborhood] = useState('');
  const [newFee, setNewFee] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);

  const handleToggleActive = (id: string) => {
    setDeliveryFees(prev => 
      prev.map(fee => 
        fee.id === id ? { ...fee, isActive: !fee.isActive } : fee
      )
    );
  };

  const handleUpdateFee = (id: string, newValue: string) => {
    const value = parseFloat(newValue);
    if (isNaN(value) || value < 0) return;

    setDeliveryFees(prev =>
      prev.map(fee =>
        fee.id === id ? { ...fee, fee: value } : fee
      )
    );
  };

  const handleAddNew = () => {
    if (!newNeighborhood.trim() || !newFee.trim()) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    const value = parseFloat(newFee);
    if (isNaN(value) || value < 0) {
      Alert.alert('Erro', 'Valor inválido');
      return;
    }

    const newId = (deliveryFees.length + 1).toString();
    setDeliveryFees(prev => [
      ...prev,
      {
        id: newId,
        neighborhood: newNeighborhood.trim(),
        fee: value,
        isActive: true,
      }
    ]);

    setNewNeighborhood('');
    setNewFee('');
    setIsAddingNew(false);
  };

  return (
    <View style={styles.container}>
      
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Taxas de Entrega</Text>
          {!isAddingNew && (
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setIsAddingNew(true)}
            >
              <Ionicons name="add" size={24} color={colors.white} />
            </TouchableOpacity>
          )}
        </View>

        {isAddingNew && (
          <View style={styles.addNewContainer}>
            <TextInput
              style={styles.input}
              placeholder="Nome do bairro"
              value={newNeighborhood}
              onChangeText={setNewNeighborhood}
            />
            <TextInput
              style={styles.input}
              placeholder="Valor da taxa"
              value={newFee}
              onChangeText={setNewFee}
              keyboardType="decimal-pad"
            />
            <View style={styles.addNewButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => setIsAddingNew(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleAddNew}
              >
                <Text style={styles.saveButtonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
                  style={styles.feeInput}
                  value={fee.fee.toString()}
                  onChangeText={(value) => handleUpdateFee(fee.id, value)}
                  keyboardType="decimal-pad"
                  editable={fee.isActive}
                />
              </View>
            </View>
          ))}
        </View>
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
  addButton: {
    backgroundColor: colors.green[500],
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
  addNewContainer: {
    backgroundColor: colors.white,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  input: {
    fontSize: 16,
    color: colors.gray[800],
    padding: 12,
    backgroundColor: colors.gray[100],
    borderRadius: 8,
    marginBottom: 12,
  },
  addNewButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: colors.gray[200],
  },
  saveButton: {
    backgroundColor: colors.green[500],
  },
  cancelButtonText: {
    color: colors.gray[700],
    fontWeight: '500',
  },
  saveButtonText: {
    color: colors.white,
    fontWeight: '500',
  },
}); 