import React, { useState, useEffect, useCallback } from 'react';
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
  const [editValidUntilTime, setEditValidUntilTime] = useState('');

  // Estados para o modal de criação
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscountType, setNewCouponDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [newCouponValue, setNewCouponValue] = useState('');
  const [newCouponValidUntil, setNewCouponValidUntil] = useState('');
  const [newCouponValidUntilTime, setNewCouponValidUntilTime] = useState('');

  // Estados para o modal de confirmação de exclusão
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<CouponWithStatus | null>(null);

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
        const isExpired = isCouponExpired(coupon.validUntil, coupon.validUntilTime);
        const validity = isExpired ? 'Expirado' : `Válido até ${formatDate(coupon.validUntil, coupon.validUntilTime)}`;
        
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
  const isCouponExpired = (validUntil: string, validUntilTime: string): boolean => {
    const endDate = new Date(`${validUntil}T${validUntilTime}`);
    const now = new Date();
    return endDate < now;
  };

  // Função para formatar a data e hora
  const formatDate = (dateString: string, timeString: string): string => {
    const date = new Date(`${dateString}T${timeString}`);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Função para formatar o código do cupom
  const formatCouponCode = useCallback((code: string) => {
    // Remove espaços e caracteres especiais, mantém apenas letras e números
    const formattedCode = code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return formattedCode;
  }, []);

  // Função para lidar com a mudança do código do cupom
  const handleCouponCodeChange = useCallback((text: string) => {
    // Converte para maiúsculas sem causar loop
    const upperText = text.toUpperCase();
    setNewCouponCode(upperText);
  }, []);

  // Função para lidar com a mudança da data
  const handleDateChange = useCallback((text: string) => {
    // Remove caracteres não numéricos
    const numbersOnly = text.replace(/[^0-9]/g, '');
    
    // Formata automaticamente como DD/MM/AAAA
    let formatted = numbersOnly;
    if (numbersOnly.length >= 2) {
      formatted = numbersOnly.slice(0, 2) + '/' + numbersOnly.slice(2, 4);
    }
    if (numbersOnly.length >= 4) {
      formatted = numbersOnly.slice(0, 2) + '/' + numbersOnly.slice(2, 4) + '/' + numbersOnly.slice(4, 8);
    }
    
    setNewCouponValidUntil(formatted);
  }, []);

  // Função para lidar com a mudança da hora
  const handleTimeChange = useCallback((text: string) => {
    // Remove caracteres não numéricos
    const numbersOnly = text.replace(/[^0-9]/g, '');
    
    // Formata automaticamente como HH:mm
    let formatted = numbersOnly;
    if (numbersOnly.length >= 2) {
      formatted = numbersOnly.slice(0, 2) + ':' + numbersOnly.slice(2, 4);
    }
    
    setNewCouponValidUntilTime(formatted);
  }, []);

  // Função para validar o formato da hora
  const validateTimeFormat = (time: string): boolean => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };

  // Função para limpar os campos do formulário de criação
  const clearCreateForm = () => {
    setNewCouponCode('');
    setNewCouponValue('');
    setNewCouponValidUntil('');
    setNewCouponValidUntilTime('');
    setNewCouponDiscountType('percentage');
  };

  // Função para fechar o modal de criação
  const handleCloseCreateModal = () => {
    setIsCreateModalVisible(false);
    clearCreateForm();
  };

  // Função para criar cupom
  const handleCreateCoupon = async () => {
    if (!newCouponCode.trim() || !newCouponValue || !newCouponValidUntil || !newCouponValidUntilTime || !user?.uid) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    // Validar e formatar o código do cupom
    const formattedCode = formatCouponCode(newCouponCode);
    if (formattedCode.length < 3) {
      alert('O código do cupom deve ter pelo menos 3 caracteres');
      return;
    }

    if (!validateTimeFormat(newCouponValidUntilTime)) {
      alert('Por favor, insira uma hora válida no formato HH:mm (ex: 23:00)');
      return;
    }

    const value = parseFloat(newCouponValue);
    if (isNaN(value) || value <= 0) {
      alert('Por favor, insira um valor válido');
      return;
    }

    try {
      const newCoupon = {
        code: formattedCode,
        storeId: user.uid,
        discountType: newCouponDiscountType,
        value,
        validUntil: newCouponValidUntil,
        validUntilTime: newCouponValidUntilTime,
        isActive: true,
        usedBy: []
      };

      await couponService.createCoupon(newCoupon);
      await loadCoupons();
      
      handleCloseCreateModal();
      
      // Mostrar mensagem de sucesso
      alert('Cupom criado com sucesso! Notificação enviada para os usuários.');
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
    setEditValidUntilTime(coupon.validUntilTime);
    
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

      if (!validateTimeFormat(editValidUntilTime)) {
        alert('Por favor, insira uma hora válida no formato HH:mm (ex: 23:00)');
        return;
      }

      const updates = {
        value,
        validUntil: editValidUntil,
        validUntilTime: editValidUntilTime
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
      const newActiveState = !coupon.isActive;
      await couponService.toggleCouponActive(user.uid, coupon.id, newActiveState);
      await loadCoupons();
      
      // Mostrar mensagem de sucesso se o cupom foi ativado
      if (newActiveState) {
        alert('Cupom ativado com sucesso! Notificação enviada para os usuários.');
      }
    } catch (error) {
      console.error('Erro ao alterar status do cupom:', error);
      alert('Erro ao alterar status do cupom. Tente novamente.');
    }
  };

  // Função para abrir modal de confirmação de exclusão
  const handleDeleteCoupon = (coupon: CouponWithStatus) => {
    setCouponToDelete(coupon);
    setMenuVisible(null);
    setIsDeleteModalVisible(true);
  };

  // Função para confirmar exclusão do cupom
  const handleConfirmDelete = async () => {
    if (!couponToDelete || !user?.uid) return;
    
    try {
      await couponService.deleteCoupon(user.uid, couponToDelete.id);
      await loadCoupons();
      
      setIsDeleteModalVisible(false);
      setCouponToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir cupom:', error);
      alert('Erro ao excluir cupom. Tente novamente.');
    }
  };

  // Renderiza o modal de edição
  const renderEditModal = () => {
    if (!selectedCoupon) return null;
    
    return (
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        onRequestClose={() => setIsEditModalVisible(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.fullScreenModal}>
          <View style={styles.fullScreenHeader}>
            <TouchableOpacity 
              onPress={() => setIsEditModalVisible(false)} 
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.fullScreenTitle}>Editar Cupom</Text>
            <View style={styles.couponStatusBadge}>
              <Text style={styles.couponStatusText}>
                {selectedCoupon.isActive ? 'Ativo' : 'Inativo'}
              </Text>
            </View>
          </View>
          
          <ScrollView 
            style={styles.fullScreenContent} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContentContainer}
          >
            <View style={styles.couponInfoCard}>
              <View style={styles.couponCodeContainer}>
                <Ionicons name="ticket" size={28} color={colors.orange} />
                <Text style={styles.couponCodeText}>{selectedCoupon.code}</Text>
              </View>
              <Text style={styles.couponTypeText}>
                {selectedCoupon.discountType === 'percentage' ? 'Desconto em Porcentagem' : 'Desconto em Valor Fixo'}
              </Text>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Valor do Desconto</Text>
              <View style={styles.discountInputContainer}>
                <TextInput
                  mode="outlined"
                  value={editValue}
                  onChangeText={setEditValue}
                  style={styles.input}
                  outlineColor={colors.gray[300]}
                  activeOutlineColor={colors.orange}
                  keyboardType="numeric"
                  right={<TextInput.Icon icon="currency-usd" color={colors.orange} />}
                />
                <View style={styles.discountUnitBadge}>
                  <Text style={styles.discountUnitText}>
                    {selectedCoupon.discountType === 'percentage' ? '%' : 'R$'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Data de Validade</Text>
              <TextInput
                mode="outlined"
                value={editValidUntil}
                onChangeText={setEditValidUntil}
                style={styles.input}
                outlineColor={colors.gray[300]}
                activeOutlineColor={colors.orange}
                placeholder="DD/MM/AAAA"
                right={<TextInput.Icon icon="calendar" color={colors.orange} />}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Hora de Validade</Text>
              <TextInput
                mode="outlined"
                value={editValidUntilTime}
                onChangeText={setEditValidUntilTime}
                style={styles.input}
                outlineColor={colors.gray[300]}
                activeOutlineColor={colors.orange}
                placeholder="HH:mm"
                right={<TextInput.Icon icon="clock-outline" color={colors.orange} />}
              />
              <Text style={styles.helperText}>
                Digite a hora no formato HH:mm (ex: 23:00)
              </Text>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="people" size={20} color={colors.gray[500]} />
                </View>
                <Text style={styles.statLabel}>Usado por</Text>
                <Text style={styles.statValue}>{selectedCoupon.usedBy.length} clientes</Text>
              </View>
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="time" size={20} color={colors.gray[500]} />
                </View>
                <Text style={styles.statLabel}>Status</Text>
                <Text style={[
                  styles.statValue,
                  selectedCoupon.isExpired && styles.expiredText
                ]}>
                  {selectedCoupon.isExpired ? 'Expirado' : 'Válido'}
                </Text>
              </View>
            </View>
            
            {/* Espaço extra para garantir que as estatísticas não sejam cobertas */}
            <View style={styles.bottomSpacer} />
          </ScrollView>
          
                      <View style={styles.fullScreenFooter}>
              <View style={styles.buttonRow}>
                <Button 
                  mode="outlined" 
                  onPress={() => setIsEditModalVisible(false)}
                  style={styles.cancelButton}
                  labelStyle={styles.cancelButtonLabel}
                  icon="close"
                >
                  CANCELAR
                </Button>
                <Button 
                  mode="contained" 
                  onPress={handleSaveEdit}
                  style={styles.editSaveButton}
                  labelStyle={styles.buttonLabel}
                  icon="check"
                >
                  SALVAR
                </Button>
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
        onRequestClose={handleCloseCreateModal}
      >
        <View style={styles.fullScreenModal}>
          <View style={styles.fullScreenHeader}>
            <TouchableOpacity 
              onPress={handleCloseCreateModal} 
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.fullScreenTitle}>Criar Novo Cupom</Text>
            <View style={styles.headerRightPlaceholder} />
          </View>
          
          <ScrollView 
            style={styles.fullScreenContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.createModalScrollContent}
          >
            <View style={styles.formContainer}>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Informações Básicas</Text>
                
                <Text style={styles.inputLabel}>Código do Cupom</Text>
                <TextInput
                  mode="outlined"
                  value={newCouponCode}
                  onChangeText={handleCouponCodeChange}
                  style={styles.input}
                  outlineColor={colors.gray[300]}
                  activeOutlineColor={colors.orange}
                  placeholder="Ex: PEDIFACIL10"
                  autoCapitalize="characters"
                  right={<TextInput.Icon icon="ticket-percent" color={colors.orange} />}
                />
                <Text style={styles.helperText}>
                  Digite apenas letras e números (convertido para maiúsculas automaticamente)
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
                
                <Text style={styles.inputLabel}>Data de validade</Text>
                <TextInput
                  mode="outlined"
                  value={newCouponValidUntil}
                  onChangeText={handleDateChange}
                  style={styles.input}
                  outlineColor={colors.gray[300]}
                  activeOutlineColor={colors.orange}
                  placeholder="DD/MM/AAAA"
                  keyboardType="numeric"
                  maxLength={10}
                  right={<TextInput.Icon icon="calendar" color={colors.orange} />}
                />

                <Text style={styles.inputLabel}>Hora de validade</Text>
                <TextInput
                  mode="outlined"
                  value={newCouponValidUntilTime}
                  onChangeText={handleTimeChange}
                  style={styles.input}
                  outlineColor={colors.gray[300]}
                  activeOutlineColor={colors.orange}
                  placeholder="HH:mm"
                  keyboardType="numeric"
                  maxLength={5}
                  right={<TextInput.Icon icon="clock-outline" color={colors.orange} />}
                />
                <Text style={styles.helperText}>
                  Digite a hora no formato HH:mm (ex: 23:00)
                </Text>
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
      
      <ScrollView style={styles.couponList} showsVerticalScrollIndicator={false}>
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
                  contentStyle={styles.menuContent}
                  style={styles.menuContainer}
                >
                  <Menu.Item 
                    onPress={() => handleEditCoupon(coupon)} 
                    title="Editar cupom" 
                    leadingIcon={() => <MaterialIcons name="edit" size={20} color={colors.text.primary} />}
                    titleStyle={styles.menuItemTitle}
                  />
                  <Menu.Item 
                    onPress={() => handleDeleteCoupon(coupon)} 
                    title="Excluir cupom" 
                    leadingIcon={() => <MaterialIcons name="delete" size={20} color="#FF4444" />}
                    titleStyle={[styles.menuItemTitle, { color: '#FF4444' }]}
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
      
      {/* Modal de confirmação de exclusão */}
      <Modal
        visible={isDeleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDeleteModalVisible(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteModalHeader}>
              <View style={styles.deleteIconContainer}>
                <Ionicons name="warning" size={32} color="#FF4444" />
              </View>
              <Text style={styles.deleteModalTitle}>Excluir Cupom</Text>
              <Text style={styles.deleteModalText}>
                Tem certeza que deseja excluir o cupom{' '}
                <Text style={styles.deleteCouponCode}>{couponToDelete?.code}</Text>?
              </Text>
              <Text style={styles.deleteModalWarning}>
                Esta ação não pode ser desfeita.
              </Text>
            </View>
            
            <View style={styles.deleteModalFooter}>
              <Button 
                mode="outlined" 
                onPress={() => setIsDeleteModalVisible(false)}
                style={styles.deleteCancelButton}
                labelStyle={styles.deleteCancelButtonLabel}
              >
                CANCELAR
              </Button>
              <Button 
                mode="contained" 
                onPress={handleConfirmDelete}
                style={styles.deleteConfirmButton}
                labelStyle={styles.deleteConfirmButtonLabel}
                icon="delete"
              >
                EXCLUIR
              </Button>
            </View>
          </View>
        </View>
      </Modal>
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
  menuContent: {
    backgroundColor: colors.white,
    borderRadius: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  menuContainer: {
    zIndex: 1000,
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '500',
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
    borderRadius: 20,
    width: '95%',
    maxHeight: '85%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    padding: 8,
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  couponStatusBadge: {
    backgroundColor: colors.orange,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  couponStatusText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalScrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  couponInfoCard: {
    backgroundColor: colors.orange + '10',
    borderRadius: 16,
    padding: 24,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: colors.orange + '20',
  },
  couponCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  couponCodeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.orange,
    marginLeft: 12,
    letterSpacing: 1,
  },
  couponTypeText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontStyle: 'italic',
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
  discountUnitBadge: {
    backgroundColor: colors.orange,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginLeft: 10,
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  discountUnitText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 28,
    marginBottom: 60,
    gap: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gray[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  editSaveButton: {
    backgroundColor: colors.orange,
    borderRadius: 12,
    paddingVertical: 14,
    flex: 1,
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.gray[300],
    flex: 1,
    minHeight: 48,
  },
  cancelButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
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
    padding: 20,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 12,
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
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    backgroundColor: colors.white,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: colors.white,
    position: 'relative',
  },
  fullScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
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
    padding: 20,
  },
  createModalScrollContent: {
    paddingBottom: 140, // Espaço para o footer
  },
  scrollContentContainer: {
    paddingBottom: 20,
  },
  bottomSpacer: {
    height: 140,
  },
  fullScreenFooter: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    backgroundColor: colors.white,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    zIndex: 1000,
    height: 120,
  },
  // Estilos para o modal de exclusão
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContent: {
    backgroundColor: colors.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  deleteModalHeader: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  deleteIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF4444' + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 12,
  },
  deleteModalText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  deleteCouponCode: {
    fontWeight: 'bold',
    color: colors.orange,
  },
  deleteModalWarning: {
    fontSize: 14,
    color: '#FF4444',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  deleteModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    gap: 12,
  },
  deleteCancelButton: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.gray[300],
    flex: 1,
    minHeight: 48,
  },
  deleteCancelButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  deleteConfirmButton: {
    backgroundColor: '#FF4444',
    borderRadius: 12,
    paddingVertical: 14,
    flex: 1,
    minHeight: 48,
  },
  deleteConfirmButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
}); 