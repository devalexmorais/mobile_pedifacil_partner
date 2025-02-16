import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
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

export default function Signature() {
  const router = useRouter();
  const { user } = useAuth();
  const { isPremium, daysRemaining, loading: premiumLoading } = usePremium();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const plansRef = collection(db, 'plans');
      const snapshot = await getDocs(plansRef);
      
      const activePlans = snapshot.docs
        .map(doc => {
          const data = doc.data();
          console.log('Dados do plano:', data);
          
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

      console.log('Planos ativos:', activePlans);
      setPlans(activePlans);
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os planos disponíveis');
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

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
  };

  const handleSubscribe = async () => {
    if (!selectedPlan || !user) return;

    try {
      setProcessingPayment(true);
      console.log('Ativando plano:', selectedPlan);
      
      const partnerRef = doc(db, 'partners', user.uid);
      const docSnap = await getDoc(partnerRef);
      
      if (docSnap.exists()) {
        const currentData = docSnap.data();
        const currentStore = currentData.store || {};

        // Criar novo objeto store
        const newStore = {
          ...currentStore,
          isPremium: true, // Sempre true ao assinar um plano
          premiumExpiresAt: new Date(Date.now() + selectedPlan.days * 24 * 60 * 60 * 1000).toISOString(),
          premiumFeatures: {
            analytics: true,
            advancedReports: true,
            prioritySupport: true,
          }
        };

        // Atualizar o documento
        await updateDoc(partnerRef, {
          store: newStore,
          updatedAt: serverTimestamp()
        });

        Alert.alert(
          'Sucesso!',
          `Plano ${selectedPlan.name} ativado com sucesso!`,
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

  if (loading || premiumLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.currentPlanContainer}>
          <Text style={styles.currentPlanTitle}>Seu Plano Atual</Text>
          <View style={[styles.premiumBadge, !isPremium && styles.standardBadge]}>
            <Ionicons 
              name={isPremium ? "star" : "star-outline"} 
              size={24} 
              color={isPremium ? "#FFD700" : "#666"} 
            />
            <Text style={[styles.premiumText, !isPremium && styles.standardText]}>
              {isPremium ? 'Premium' : 'Padrão'}
            </Text>
          </View>
          {isPremium ? (
            <Text style={styles.daysRemaining}>
              {daysRemaining} dias restantes
            </Text>
          ) : (
            <Text style={styles.lifetimeText}>Plano Vitalício</Text>
          )}
        </View>

        <Text style={styles.title}>Escolha seu plano</Text>
        
        {plans.map((plan) => (
          <TouchableOpacity
            key={plan.id}
            style={[
              styles.planCard,
              selectedPlan?.id === plan.id && styles.selectedPlan
            ]}
            onPress={() => handleSelectPlan(plan)}
          >
            <View style={styles.planHeader}>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planDuration}>{plan.days} dias de acesso</Text>
              </View>
              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>por apenas</Text>
                <Text style={styles.planPrice}>{formatCurrency(plan.price)}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.advantagesContainer}>
              <Text style={styles.advantagesTitle}>Vantagens do Plano:</Text>
              {Array.isArray(plan.features) && plan.features.map((feature, index) => (
                <View key={index} style={styles.advantageRow}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.green[500]} />
                  <Text style={styles.advantageText}>{feature}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        ))}

        {selectedPlan && (
          <TouchableOpacity
            style={[styles.subscribeButton, processingPayment && styles.buttonDisabled]}
            onPress={handleSubscribe}
            disabled={processingPayment}
          >
            <Text style={styles.subscribeButtonText}>
              {processingPayment ? 'Processando...' : 'Assinar Agora'}
            </Text>
          </TouchableOpacity>
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
  scrollContent: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.gray[800],
    marginBottom: 16,
    marginTop: 8,
  },
  planCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedPlan: {
    borderColor: colors.blue[500],
    borderWidth: 2,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.gray[800],
    marginBottom: 4,
  },
  planDuration: {
    fontSize: 14,
    color: colors.gray[600],
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 12,
    color: colors.gray[500],
    marginBottom: 2,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.blue[500],
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[200],
    marginVertical: 16,
  },
  advantagesContainer: {
    gap: 12,
  },
  advantagesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: 8,
  },
  advantageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  advantageText: {
    flex: 1,
    fontSize: 14,
    color: colors.gray[600],
    lineHeight: 20,
  },
  currentPlanContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  currentPlanTitle: {
    fontSize: 16,
    color: colors.gray[600],
    marginBottom: 8,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.yellow[50],
    padding: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  premiumText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.gray[800],
  },
  daysRemaining: {
    fontSize: 14,
    color: colors.gray[600],
  },
  subscribeButton: {
    backgroundColor: colors.blue[500],
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
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
  standardBadge: {
    backgroundColor: colors.gray[100],
  },
  standardText: {
    color: colors.gray[600],
  },
  lifetimeText: {
    fontSize: 14,
    color: colors.gray[600],
    fontStyle: 'italic'
  },
}); 