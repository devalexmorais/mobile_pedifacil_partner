import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import { colors } from '@/styles/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePremium } from '../../../hooks/usePremium';
import { premiumService } from '../../../services/premiumService';
import { useAuth } from '../../../contexts/AuthContext';
import { formatCurrency } from '../../../utils/format';
import { collection, getDocs, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';

interface Plan {
  id: string;
  name: string;
  price: number;
  days: number;
  features: string[];
  isActive: boolean;
}

interface PremiumFeature {
  title: string;
  description: string;
  icon: string;
}

export default function Signature() {
  const router = useRouter();
  const { user } = useAuth();
  const { isPremium, daysRemaining, loading: premiumLoading } = usePremium();
  const [processingPayment, setProcessingPayment] = useState(false);
  const [premiumPlan, setPremiumPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [processingCancellation, setProcessingCancellation] = useState(false);

  // Lista detalhada de recursos premium
  const premiumFeatures: PremiumFeature[] = [
    {
      title: 'Criação de Cupons',
      description: 'Crie e gerencie cupons de desconto para seus clientes',
      icon: 'pricetag'
    },
    {
      title: 'Produtos Ilimitados',
      description: 'Cadastre quantos produtos desejar sem restrições de limite',
      icon: 'infinite'
    },
    {
      title: 'Promoções de Produtos',
      description: 'Configure e gerencie promoções personalizadas para seus produtos',
      icon: 'ribbon'
    },
    {
      title: 'Taxa Reduzida (5%)',
      description: 'Diminuição da taxa de 8% para apenas 5% em todas as transações',
      icon: 'trending-down'
    },
    {
      title: 'Relatórios Completos',
      description: 'Acesse relatórios detalhados e avançados para análise do seu negócio',
      icon: 'stats-chart'
    }
  ];

  useEffect(() => {
    loadPremiumPlan();
  }, []);

  const loadPremiumPlan = async () => {
    try {
      setLoading(true);
      const plansRef = collection(db, 'plans');
      const snapshot = await getDocs(plansRef);
      
      const activePlans = snapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || '',
            price: data.price || 0,
            days: data.days || 30,
            features: data.features || [],
            isActive: data.isActive || false
          } as Plan;
        })
        .filter(plan => plan.isActive);

      if (activePlans.length > 0) {
        setPremiumPlan(activePlans[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar plano premium:', error);
      Alert.alert('Erro', 'Não foi possível carregar o plano premium');
    } finally {
      setLoading(false);
    }
  };

  const handlePremiumFeature = (featureName: string) => {
    if (!isPremium) {
      Alert.alert(
        'Recurso Premium',
        `Faça upgrade para o plano premium para acessar ${featureName}.`,
        [
          { text: 'Agora não' },
          { 
            text: 'Ver Planos',
            onPress: () => router.push('/(auth)/drawer/signature')
          }
        ]
      );
      return false;
    }
    return true;
  };

  const handleSubscribe = async () => {
    if (!premiumPlan || !user) return;

    try {
      setProcessingPayment(true);
      console.log('Ativando plano premium:', premiumPlan);
      
      const partnerRef = doc(db, 'partners', user.uid);
      const docSnap = await getDoc(partnerRef);
      
      if (docSnap.exists()) {
        const currentData = docSnap.data();
        const currentStore = currentData.store || {};

        // Criar novo objeto store
        const newStore = {
          ...currentStore,
          isPremium: true,
          premiumExpiresAt: new Date(Date.now() + premiumPlan.days * 24 * 60 * 60 * 1000).toISOString(),
          premiumFeatures: {
            createCoupons: true,
            unlimitedProducts: true,
            productPromotions: true,
            reducedFee: true,
            advancedReports: true
          }
        };

        // Atualizar o documento
        await updateDoc(partnerRef, {
          store: newStore,
          updatedAt: serverTimestamp()
        });

        Alert.alert(
          'Sucesso!',
          `Plano Premium ativado com sucesso!`,
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Erro ao ativar plano:', error);
      Alert.alert(
        'Erro',
        'Não foi possível ativar o plano. Tente novamente.'
      );
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user) return;

    try {
      setProcessingCancellation(true);
      
      const partnerRef = doc(db, 'partners', user.uid);
      const docSnap = await getDoc(partnerRef);
      
      if (docSnap.exists()) {
        const currentData = docSnap.data();
        const currentStore = currentData.store || {};

        // Mantém a assinatura até a data de expiração, mas marca como cancelada
        const newStore = {
          ...currentStore,
          subscriptionCancelled: true,
          cancellationDate: serverTimestamp()
        };

        // Atualizar o documento
        await updateDoc(partnerRef, {
          store: newStore,
          updatedAt: serverTimestamp()
        });

        setModalVisible(false);
        
        Alert.alert(
          'Assinatura Cancelada',
          'Sua assinatura foi cancelada com sucesso. Você ainda terá acesso aos recursos premium até o final do período contratado.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Erro ao cancelar assinatura:', error);
      Alert.alert(
        'Erro',
        'Não foi possível cancelar a assinatura. Tente novamente.'
      );
    } finally {
      setProcessingCancellation(false);
    }
  };

  const CancelSubscriptionModal = () => {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancelar Assinatura</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.gray[700]} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalDivider} />
            
            <Text style={styles.modalText}>
              Tem certeza que deseja cancelar sua assinatura Premium?
            </Text>
            
            <Text style={styles.modalSubtext}>
              Você continuará tendo acesso aos recursos premium até o final do período contratado ({daysRemaining} dias).
            </Text>
            
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity 
                style={styles.modalCancelButton} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Voltar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.confirmButton, processingCancellation && styles.buttonDisabled]} 
                onPress={handleCancelSubscription}
                disabled={processingCancellation}
              >
                <Text style={styles.confirmButtonText}>
                  {processingCancellation ? 'Processando...' : 'Confirmar Cancelamento'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading || premiumLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Minha Assinatura</Text>
          
          <View style={styles.statusCard}>
            <View style={[styles.statusBadge, isPremium ? styles.premiumBadge : styles.basicBadge]}>
              <Ionicons 
                name={isPremium ? "star" : "star-outline"} 
                size={22} 
                color={isPremium ? colors.white : colors.gray[500]} 
              />
              <Text style={[styles.statusBadgeText, isPremium ? styles.premiumBadgeText : styles.basicBadgeText]}>
                {isPremium ? 'Premium' : 'Básico'}
              </Text>
            </View>
            
            <View style={styles.statusInfo}>
              {isPremium ? (
                <Text style={styles.statusInfoText}>
                  Seu plano premium está ativo e válido por mais <Text style={styles.daysText}>{daysRemaining} dias</Text>.
                </Text>
              ) : (
                <Text style={styles.statusInfoText}>
                  Você está usando o plano básico. Faça upgrade para desbloquear todos os recursos premium.
                </Text>
              )}
            </View>
            
            {isPremium && (
              <TouchableOpacity 
                style={styles.cancelLink} 
                onPress={() => setModalVisible(true)}
              >
                <Text style={styles.cancelLinkText}>Cancelar assinatura</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isPremium && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Benefícios Premium Ativos</Text>
            {premiumFeatures.map((feature, index) => (
              <View key={index} style={styles.benefitCard}>
                <View style={styles.benefitIconContainer}>
                  <Ionicons name={feature.icon as any} size={22} color={colors.orange} />
                </View>
                <View style={styles.benefitContent}>
                  <Text style={styles.benefitTitle}>{feature.title}</Text>
                  <Text style={styles.benefitDescription}>{feature.description}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={18} color={colors.green[500]} />
              </View>
            ))}
          </View>
        )}

        {!isPremium && premiumPlan && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Compare os Planos</Text>
            
            <View style={styles.planComparisonCard}>
              <View style={styles.planComparisonHeader}>
                <View style={styles.planTypeColumn}>
                  <Text style={styles.planTypeLabel}></Text>
                </View>
                <View style={styles.planTypeColumn}>
                  <Text style={styles.planTypeLabel}>Básico</Text>
                  <Text style={styles.planTypeSubtitle}>Seu plano atual</Text>
                </View>
                <View style={[styles.planTypeColumn, styles.premiumColumn]}>
                  <Text style={styles.premiumPlanTypeLabel}>Premium</Text>
                  <Text style={styles.planTypeSubtitle}>Recomendado</Text>
                </View>
              </View>
              
              <View style={styles.divider}></View>
              
              <View style={styles.featureComparisonRow}>
                <Text style={styles.featureLabel}>Cupons de desconto</Text>
                <View style={styles.planTypeColumn}>
                  <Ionicons name="close" size={20} color={colors.red[400]} />
                </View>
                <View style={[styles.planTypeColumn, styles.premiumColumn]}>
                  <Ionicons name="checkmark" size={20} color={colors.green[500]} />
                </View>
              </View>
              
              <View style={styles.featureComparisonRow}>
                <Text style={styles.featureLabel}>Produtos cadastrados</Text>
                <View style={styles.planTypeColumn}>
                  <Text style={styles.limitText}>Até 30</Text>
                </View>
                <View style={[styles.planTypeColumn, styles.premiumColumn]}>
                  <Text style={styles.unlimitedText}>Ilimitado</Text>
                </View>
              </View>
              
              <View style={styles.featureComparisonRow}>
                <Text style={styles.featureLabel}>Promoções de produtos</Text>
                <View style={styles.planTypeColumn}>
                  <Ionicons name="close" size={20} color={colors.red[400]} />
                </View>
                <View style={[styles.planTypeColumn, styles.premiumColumn]}>
                  <Ionicons name="checkmark" size={20} color={colors.green[500]} />
                </View>
              </View>
              
              <View style={styles.featureComparisonRow}>
                <Text style={styles.featureLabel}>Taxa do aplicativo</Text>
                <View style={styles.planTypeColumn}>
                  <Text style={styles.limitText}>8%</Text>
                </View>
                <View style={[styles.planTypeColumn, styles.premiumColumn]}>
                  <Text style={styles.unlimitedText}>5%</Text>
                </View>
              </View>
              
              <View style={styles.featureComparisonRow}>
                <Text style={styles.featureLabel}>Relatórios completos</Text>
                <View style={styles.planTypeColumn}>
                  <Ionicons name="close" size={20} color={colors.red[400]} />
                </View>
                <View style={[styles.planTypeColumn, styles.premiumColumn]}>
                  <Ionicons name="checkmark" size={20} color={colors.green[500]} />
                </View>
              </View>
              
              <View style={styles.divider}></View>
              
              <View style={styles.priceSection}>
                <View style={styles.planTypeColumn}>
                  <Text style={styles.priceLabel}>Preço</Text>
                </View>
                <View style={styles.planTypeColumn}>
                  <Text style={styles.basicPrice}>Grátis</Text>
                </View>
                <View style={[styles.planTypeColumn, styles.premiumColumn]}>
                  <Text style={styles.premiumPrice}>{formatCurrency(premiumPlan.price)}</Text>
                  <Text style={styles.premiumPeriod}>/{premiumPlan.days} dias</Text>
                </View>
              </View>
            </View>
            
            <TouchableOpacity
              style={[styles.subscribeButton, processingPayment && styles.buttonDisabled]}
              onPress={handleSubscribe}
              disabled={processingPayment}
            >
              <Text style={styles.subscribeButtonText}>
                {processingPayment ? 'Processando...' : 'Fazer Upgrade para Premium'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
        )}
        
        <CancelSubscriptionModal />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: 16,
  },
  statusCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: colors.gray[200],
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
    marginBottom: 16,
  },
  premiumBadge: {
    backgroundColor: colors.orange,
  },
  basicBadge: {
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.gray[300],
  },
  statusBadgeText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  premiumBadgeText: {
    color: colors.white,
  },
  basicBadgeText: {
    color: colors.gray[600],
  },
  statusInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusInfoText: {
    fontSize: 16,
    color: colors.gray[700],
    textAlign: 'center',
    lineHeight: 22,
  },
  daysText: {
    fontWeight: '600',
    color: colors.gray[800],
  },
  cancelLink: {
    paddingVertical: 8,
  },
  cancelLinkText: {
    fontSize: 14,
    color: colors.red[500],
    textDecorationLine: 'underline',
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  benefitIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.gray[800],
  },
  benefitDescription: {
    fontSize: 13,
    color: colors.gray[600],
    marginTop: 2,
  },
  planComparisonCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  planComparisonHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  planTypeColumn: {
    flex: 1,
    alignItems: 'center',
  },
  premiumColumn: {
    backgroundColor: 'rgba(255, 165, 0, 0.05)',
    borderRadius: 8,
    padding: 8,
  },
  planTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[700],
  },
  premiumPlanTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.orange,
  },
  planTypeSubtitle: {
    fontSize: 12,
    color: colors.gray[500],
    marginTop: 2,
  },
  featureComparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  featureLabel: {
    flex: 2,
    fontSize: 14,
    color: colors.gray[700],
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[200],
    marginVertical: 16,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[700],
  },
  basicPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[600],
  },
  premiumPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.orange,
  },
  premiumPeriod: {
    fontSize: 12,
    color: colors.gray[500],
  },
  limitText: {
    fontSize: 14,
    color: colors.gray[600],
  },
  unlimitedText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.green[600],
  },
  subscribeButton: {
    flexDirection: 'row',
    backgroundColor: colors.orange,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 32,
  },
  subscribeButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.gray[800],
  },
  closeButton: {
    padding: 4,
  },
  modalDivider: {
    height: 1,
    backgroundColor: colors.gray[200],
    marginVertical: 16,
  },
  modalText: {
    fontSize: 16,
    color: colors.gray[800],
    marginBottom: 12,
    textAlign: 'center',
  },
  modalSubtext: {
    fontSize: 14,
    color: colors.gray[600],
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  confirmButton: {
    flex: 2,
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.red[500],
    alignItems: 'center',
  },
  confirmButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '500',
  },
  modalCancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray[300],
    marginRight: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: colors.gray[700],
    fontSize: 16,
    fontWeight: '500',
  },
}); 