import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Text, Modal } from 'react-native';
import { Switch, Button, TextInput, Menu } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '@/styles/theme/colors';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { couponService, Coupon, CouponWithStatus } from '@/services/couponService';

export default function Coupons() {
  const { user } = useAuth();
  const router = useRouter();
  const [couponsWithStatus, setCouponsWithStatus] = useState<CouponWithStatus[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<CouponWithStatus | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados para o formulário de edição
  const [editValue, setEditValue] = useState('');
  const [editValidUntil, setEditValidUntil] = useState('');

  // Estados para o modal de criação
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscountType, setNewCouponDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [newCouponValue, setNewCouponValue] = useState('');
  const [newCouponValidUntil, setNewCouponValidUntil] = useState('');

  // Carregar cupons do Firebase
  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    try {
      setIsLoading(true);
      if (!user?.uid) return;

      const coupons = await couponService.getCouponsByStore(user.uid);
      
      // Atualizar status dos cupons
      const updatedCoupons = coupons.map(coupon => {
        const isExpired = isCouponExpired(coupon.validUntil);
        const validity = isExpired ? 'Expirado' : `Válido até ${formatDate(coupon.validUntil)}`;
        
        return {
          ...coupon,
          id: coupon.id || '',
          isExpired,
          validity
        } as CouponWithStatus;
      });
      
      setCouponsWithStatus(updatedCoupons);
    } catch (error) {
      console.error('Erro ao carregar cupons:', error);
      alert('Erro ao carregar cupons. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Função para verificar se um cupom está expirado
  const isCouponExpired = (validUntil: string): boolean => {
    const endDate = new Date(validUntil);
    const today = new Date();
    
    // Reseta as horas para comparar apenas as datas
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    
    return endDate < today;
  };

  // Função para formatar a data
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  // Função para formatar o código do cupom
  const formatCouponCode = (code: string) => {
    // Remove espaços e caracteres especiais, mantém apenas letras e números
    const formattedCode = code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return formattedCode;
  };

  // Função para criar cupom
  const handleCreateCoupon = async () => {
    if (!newCouponCode.trim() || !newCouponValue || !newCouponValidUntil || !user?.uid) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    const value = parseFloat(newCouponValue);
    if (isNaN(value) || value <= 0) {
      alert('Por favor, insira um valor válido');
      return;
    }

    try {
      const newCoupon = {
        code: formatCouponCode(newCouponCode),
        storeId: user.uid,
        discountType: newCouponDiscountType,
        value,
        validUntil: newCouponValidUntil,
        isActive: true,
        usedBy: []
      };

      await couponService.createCoupon(newCoupon);
      await loadCoupons();
      
      setIsCreateModalVisible(false);
      setNewCouponCode('');
      setNewCouponValue('');
      setNewCouponValidUntil('');
      setNewCouponDiscountType('percentage');
    } catch (error) {
      console.error('Erro ao criar cupom:', error);
      alert('Erro ao criar cupom. Tente novamente.');
    }
  };

  // Função para editar cupom
  const handleEditCoupon = (coupon: CouponWithStatus) => {
    setSelectedCoupon(coupon);
    setMenuVisible(null);
    
    setEditValue(coupon.value.toString());
    setEditValidUntil(coupon.validUntil);
    
    setIsEditModalVisible(true);
  };

  // Função para salvar edição
  const handleSaveEdit = async () => {
    if (!selectedCoupon || !user?.uid) return;
    
    try {
      const value = parseFloat(editValue);
      if (isNaN(value) || value <= 0) {
        alert('Por favor, insira um valor válido');
        return;
      }

      const updates = {
        value,
        validUntil: editValidUntil
      };
      
      await couponService.updateCoupon(user.uid, selectedCoupon.id, updates);
      await loadCoupons();
      
      setIsEditModalVisible(false);
      setSelectedCoupon(null);
    } catch (error) {
      console.error('Erro ao atualizar cupom:', error);
      alert('Erro ao atualizar cupom. Tente novamente.');
    }
  };

  // Função para alternar status do cupom
  const handleToggleActive = async (coupon: CouponWithStatus) => {
    try {
      if (!user?.uid) return;
      await couponService.toggleCouponActive(user.uid, coupon.id, !coupon.isActive);
      await loadCoupons();
    } catch (error) {
      console.error('Erro ao alterar status do cupom:', error);
      alert('Erro ao alterar status do cupom. Tente novamente.');
    }
  };

  // Renderiza o modal de edição
  const renderEditModal = () => {
    if (!selectedCoupon) return null;
    
    return (
      <Modal
        visible={isEditModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Editar Cupom</Text>
            </View>
            
            <View style={styles.formContainer}>
              <Text style={styles.couponNameTitle}>{selectedCoupon.code}</Text>
              <Text style={styles.modalCouponDescription}>{selectedCoupon.discountType === 'percentage' ? `${selectedCoupon.value}% de desconto` : `R$ ${selectedCoupon.value.toFixed(2)} de desconto`}</Text>
              
              <Text style={styles.inputLabel}>Valor do desconto</Text>
              <View style={styles.discountInputContainer}>
                <TextInput
                  mode="outlined"
                  value={editValue}
                  onChangeText={setEditValue}
                  style={styles.input}
                  outlineColor={colors.gray[300]}
                  activeOutlineColor={colors.orange}
                  keyboardType="numeric"
                />
                <Text style={styles.discountUnit}>
                  {selectedCoupon.discountType === 'percentage' ? '%' : 'R$'}
                </Text>
              </View>
              
              <Text style={styles.inputLabel}>Data de validade</Text>
              <TextInput
                mode="outlined"
                value={editValidUntil}
                onChangeText={setEditValidUntil}
                style={styles.input}
                outlineColor={colors.gray[300]}
                activeOutlineColor={colors.orange}
                placeholder="DD/MM/AAAA"
              />
              
              <View style={styles.buttonContainer}>
                <Button 
                  mode="contained" 
                  onPress={handleSaveEdit}
                  style={styles.editSaveButton}
                  labelStyle={styles.buttonLabel}
                >
                  SALVAR
                </Button>
                <Button 
                  mode="outlined" 
                  onPress={() => setIsEditModalVisible(false)}
                  style={styles.cancelButton}
                  labelStyle={styles.cancelButtonLabel}
                >
                  CANCELAR
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Adicione o render do modal de criação
  const renderCreateModal = () => {
    return (
      <Modal
        visible={isCreateModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsCreateModalVisible(false)}
      >
        <View style={styles.fullScreenModal}>
          <View style={styles.fullScreenHeader}>
            <TouchableOpacity 
              onPress={() => setIsCreateModalVisible(false)} 
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.fullScreenTitle}>Criar Novo Cupom</Text>
            <View style={styles.headerRightPlaceholder} />
          </View>
          
          <ScrollView style={styles.fullScreenContent}>
            <View style={styles.formContainer}>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Informações Básicas</Text>
                
                <Text style={styles.inputLabel}>Código do Cupom</Text>
                <TextInput
                  mode="outlined"
                  value={newCouponCode}
                  onChangeText={(text) => setNewCouponCode(formatCouponCode(text))}
                  style={styles.input}
                  outlineColor={colors.gray[300]}
                  activeOutlineColor={colors.orange}
                  placeholder="Ex: PEDIFACIL10"
                  right={<TextInput.Icon icon="ticket-percent" color={colors.orange} />}
                />
                <Text style={styles.helperText}>
                  O código será formatado automaticamente (apenas letras e números)
                </Text>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Valor do Desconto</Text>
                
                <View style={styles.discountTypeContainer}>
                  <TouchableOpacity 
                    style={[
                      styles.discountTypeButton,
                      newCouponDiscountType === 'percentage' && styles.discountTypeButtonActive
                    ]}
                    onPress={() => setNewCouponDiscountType('percentage')}
                  >
                    <Text style={[
                      styles.discountTypeText,
                      newCouponDiscountType === 'percentage' && styles.discountTypeTextActive
                    ]}>Porcentagem (%)</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.discountTypeButton,
                      newCouponDiscountType === 'fixed' && styles.discountTypeButtonActive
                    ]}
                    onPress={() => setNewCouponDiscountType('fixed')}
                  >
                    <Text style={[
                      styles.discountTypeText,
                      newCouponDiscountType === 'fixed' && styles.discountTypeTextActive
                    ]}>Valor Fixo (R$)</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.discountInputContainer}>
                  <TextInput
                    mode="outlined"
                    value={newCouponValue}
                    onChangeText={setNewCouponValue}
                    style={styles.input}
                    outlineColor={colors.gray[300]}
                    activeOutlineColor={colors.orange}
                    keyboardType="numeric"
                    right={<TextInput.Icon icon="currency-usd" color={colors.orange} />}
                  />
                  <Text style={styles.discountUnit}>
                    {newCouponDiscountType === 'percentage' ? '%' : 'R$'}
                  </Text>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Validade e Limites</Text>
                
                <TextInput
                  mode="outlined"
                  value={newCouponValidUntil}
                  onChangeText={setNewCouponValidUntil}
                  style={styles.input}
                  outlineColor={colors.gray[300]}
                  activeOutlineColor={colors.orange}
                  placeholder="DD/MM/AAAA"
                  right={<TextInput.Icon icon="calendar" color={colors.orange} />}
                />
              </View>
            </View>
          </ScrollView>
          
          <View style={styles.fullScreenFooter}>
            <Button 
              mode="contained" 
              onPress={handleCreateCoupon}
              style={styles.createButton}
              labelStyle={styles.buttonLabel}
              icon="check"
            >
              CRIAR CUPOM
            </Button>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cupons de desconto</Text>
        <TouchableOpacity style={styles.helpButton}>
          <Ionicons name="help-circle-outline" size={24} color={colors.orange} />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.subtitle}>
        Crie cupons personalizados para aumentar suas vendas.
      </Text>
      
      <Button
        mode="contained"
        onPress={() => setIsCreateModalVisible(true)}
        style={styles.createButton}
        labelStyle={styles.buttonLabel}
      >
        CRIAR NOVO CUPOM
      </Button>
      
      <ScrollView style={styles.couponList}>
        {isLoading ? (
          <View style={styles.emptyCoupons}>
            <Text style={styles.emptyCouponsText}>Carregando cupons...</Text>
          </View>
        ) : couponsWithStatus.length > 0 ? couponsWithStatus.map((coupon) => (
          <View key={coupon.id} style={styles.couponCard}>
            <View style={styles.couponCardHeader}>
              <View style={styles.couponCardHeaderLeft}>
                <Switch
                  value={coupon.isActive}
                  onValueChange={() => handleToggleActive(coupon)}
                  color={coupon.isExpired ? colors.gray[400] : colors.orange}
                  disabled={coupon.isExpired}
                />
                <Text style={[
                  styles.couponName, 
                  coupon.isExpired && styles.expiredText
                ]}>
                  {coupon.code}
                </Text>
              </View>
              <View style={styles.couponCardHeaderRight}>
                <Menu
                  visible={menuVisible === coupon.id}
                  onDismiss={() => setMenuVisible(null)}
                  anchor={
                    <TouchableOpacity 
                      style={styles.menuButton}
                      onPress={() => setMenuVisible(coupon.id)}
                    >
                      <Ionicons name="ellipsis-vertical" size={20} color={colors.gray[500]} />
                    </TouchableOpacity>
                  }
                >
                  <Menu.Item 
                    onPress={() => handleEditCoupon(coupon)} 
                    title="Editar cupom" 
                    leadingIcon={() => <MaterialIcons name="edit" size={20} color={colors.text.primary} />}
                  />
                </Menu>
              </View>
            </View>
            
            <Text style={styles.couponDescription}>
              {coupon.discountType === 'percentage' 
                ? `${coupon.value}% de desconto`
                : `R$ ${coupon.value.toFixed(2)} de desconto`}
            </Text>
            
            <View style={styles.couponDetails}>
              <Text style={[
                styles.couponDetail,
                coupon.isExpired && styles.expiredText
              ]}>
                Validade: {coupon.validity}
              </Text>
              <Text style={styles.couponDetail}>
                Usado por: {coupon.usedBy.length} clientes
              </Text>
            </View>
          </View>
        )) : (
          <View style={styles.emptyCoupons}>
            <Text style={styles.emptyCouponsText}>
              Não há cupons disponíveis no momento.
            </Text>
          </View>
        )}
      </ScrollView>
      
      {renderEditModal()}
      {renderCreateModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  helpButton: {
    padding: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 24,
  },
  couponList: {
    flex: 1,
  },
  couponCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  couponCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  couponCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  couponCardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  couponName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
    color: colors.orange,
  },
  expiredText: {
    color: colors.gray[400],
  },
  menuButton: {
    padding: 4,
  },
  couponDescription: {
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: 16,
  },
  couponDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  couponDetail: {
    fontSize: 14,
    color: colors.text.secondary,
    marginRight: 16,
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    width: '90%',
    maxHeight: '90%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
    color: colors.text.primary,
  },
  formContainer: {
    flex: 1,
  },
  couponNameTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: colors.text.primary,
  },
  modalCouponDescription: {
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: colors.text.primary,
  },
  discountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  input: {
    flex: 1,
    marginRight: 8,
  },
  discountUnit: {
    fontSize: 14,
    color: colors.text.primary,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  editSaveButton: {
    backgroundColor: colors.orange,
    borderRadius: 8,
    paddingVertical: 8,
    flex: 1,
    marginRight: 8,
  },
  cancelButton: {
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.gray[300],
    flex: 1,
    marginLeft: 8,
  },
  cancelButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  createButton: {
    backgroundColor: colors.orange,
    borderRadius: 8,
    marginBottom: 16,
    paddingVertical: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    backgroundColor: colors.white,
    marginBottom: 16,
  },
  picker: {
    height: 50,
    color: colors.text.primary,
  },
  emptyCoupons: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCouponsText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  formScrollView: {
    flex: 1,
  },
  formSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  discountTypeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.gray[300],
  },
  discountTypeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  discountTypeButtonActive: {
    backgroundColor: colors.orange,
  },
  discountTypeText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  discountTypeTextActive: {
    color: colors.white,
    fontWeight: 'bold',
  },
  helperText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: colors.white,
  },
  fullScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    backgroundColor: colors.white,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backButton: {
    padding: 8,
  },
  fullScreenTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  headerRightPlaceholder: {
    width: 40,
  },
  fullScreenContent: {
    flex: 1,
    padding: 16,
  },
  fullScreenFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    backgroundColor: colors.white,
  },
}); 