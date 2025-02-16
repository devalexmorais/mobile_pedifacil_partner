import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { colors } from '@/styles/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePaymentStatus } from '@/hooks/usePaymentStatus';


export default function Financeiro() {
  const router = useRouter();
  const { isPremium, isLoading } = usePaymentStatus();

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

  return (
    <View style={styles.container}>
      
      <ScrollView style={styles.scrollContent}>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visão Geral</Text>
          
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Faturamento do Mês</Text>
            </View>
            <Text style={styles.amount}>R$ 5.234,50</Text>
            <View style={styles.feeInfo}>
              <Text style={styles.feeText}>Taxa do aplicativo: R$ 261,72 (5%)</Text>
              <Text style={styles.netAmountText}>Valor líquido: R$ 4.972,78</Text>
            </View>
          </View>

          <View style={[styles.card, styles.premiumCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Análises Avançadas</Text>
              <View style={styles.premiumBadge}>
                <Ionicons name="diamond" size={12} color={colors.white} />
              </View>
            </View>
            <TouchableOpacity 
              style={styles.unlockButton}
              onPress={() => handlePremiumFeature('análises avançadas')}
            >
              <Text style={styles.unlockText}>Desbloqueie recursos premium</Text>
              <Ionicons name="lock-closed" size={16} color={colors.purple[500]} />
            </TouchableOpacity>
            <View style={styles.premiumFeaturesList}>
              <Text style={styles.premiumFeature}>• Comparativo mensal</Text>
              <Text style={styles.premiumFeature}>• Gráficos detalhados</Text>
              <Text style={styles.premiumFeature}>• Projeções futuras</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ações Rápidas</Text>
          
          <View style={styles.actionGrid}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/(auth)/drawer/faturas')}
            >
              <Ionicons name="document-text-outline" size={24} color={colors.gray[700]} />
              <Text style={styles.actionText}>Faturas</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => console.log('Pedidos')}
            >
              <Ionicons name="list-outline" size={24} color={colors.gray[700]} />
              <Text style={styles.actionText}>Pedidos</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, !isPremium && styles.actionButtonLocked]}
              onPress={() => handlePremiumFeature('relatórios avançados')}
            >
              <Ionicons name="stats-chart-outline" size={24} color={!isPremium ? colors.gray[400] : colors.gray[700]} />
              <Text style={[styles.actionText, !isPremium && styles.actionTextLocked]}>Relatórios</Text>
              {!isPremium && <Ionicons name="diamond" size={12} color={colors.purple[500]} style={styles.actionPremiumIcon} />}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Métricas do Mês</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>127</Text>
              <Text style={styles.metricLabel}>Pedidos</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>R$ 41,22</Text>
              <Text style={styles.metricLabel}>Ticket Médio</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>98%</Text>
              <Text style={styles.metricLabel}>Taxa de Entrega</Text>
            </View>
          </View>
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
  scrollContent: {
    flex: 1,
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
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    color: colors.gray[600],
  },
  amount: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.gray[800],
    marginBottom: 8,
  },
  comparison: {
    fontSize: 14,
    color: colors.green[600],
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionButtonLocked: {
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.gray[200],
    elevation: 0,
  },
  actionText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.gray[700],
    textAlign: 'center',
  },
  actionTextLocked: {
    color: colors.gray[400],
  },
  premiumBadge: {
    backgroundColor: colors.purple[500],
    padding: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: colors.purple[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.purple[100],
  },
  unlockText: {
    color: colors.purple[500],
    fontSize: 14,
    fontWeight: '500',
  },
  actionPremiumIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  feeInfo: {
    marginTop: 8,
    padding: 12,
    backgroundColor: colors.gray[100],
    borderRadius: 8,
  },
  feeText: {
    fontSize: 14,
    color: colors.gray[600],
  },
  netAmountText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray[800],
    marginTop: 4,
  },
  premiumCard: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.purple[100],
    backgroundColor: colors.purple[50],
  },
  premiumFeaturesList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.purple[100],
  },
  premiumFeature: {
    fontSize: 14,
    color: colors.gray[600],
    marginBottom: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[800],
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.gray[600],
    textAlign: 'center',
  },
}); 