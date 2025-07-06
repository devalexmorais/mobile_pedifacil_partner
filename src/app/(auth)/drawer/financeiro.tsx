import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { colors } from '@/styles/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePremium } from '../../../hooks/usePremium';
import { useFinancialData } from '../../../hooks/useFinancialData';
import { usePremiumAnalytics } from '../../../hooks/usePremiumAnalytics';
import PremiumCharts from '../../../components/PremiumCharts';


export default function Financeiro() {
  const router = useRouter();
  const { isPremium, loading: premiumLoading } = usePremium();
  const { financialData, loading: financialLoading, error: financialError } = useFinancialData();
  const { analytics, loading: analyticsLoading, error: analyticsError } = usePremiumAnalytics();

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (financialLoading || premiumLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.purple[500]} />
        <Text style={styles.loadingText}>Carregando dados financeiros...</Text>
      </View>
    );
  }

  if (financialError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning" size={48} color={colors.red[500]} />
        <Text style={styles.errorText}>Erro ao carregar dados financeiros</Text>
        <Text style={styles.errorSubtext}>{financialError}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContent}>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visão Geral</Text>
          
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Faturamento do Mês</Text>
            </View>
            <Text style={styles.amount}>
              {formatCurrency(financialData?.monthlyRevenue || 0)}
            </Text>
            <View style={styles.feeInfo}>
              <Text style={styles.feeText}>
                Taxa do aplicativo: {formatCurrency(financialData?.appFeeValue || 0)} 
                ({formatPercentage(financialData?.appFeePercentage || 0)})
              </Text>
              <Text style={styles.netAmountText}>
                Valor líquido: {formatCurrency(financialData?.netRevenue || 0)}
              </Text>
            </View>
          </View>

          <View style={[styles.card, styles.premiumCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Análises Avançadas</Text>
              <View style={styles.premiumBadge}>
                <Ionicons name="diamond" size={12} color={colors.white} />
              </View>
            </View>
            
            {isPremium && analytics ? (
              <View style={styles.premiumContent}>

                
                {analytics.topProducts.length > 0 && (
                  <View style={styles.topProductsSection}>
                    <Text style={styles.premiumSectionTitle}>Produtos Mais Vendidos</Text>
                    {analytics.topProducts.slice(0, 3).map((product, index) => (
                      <View key={index} style={styles.topProductItem}>
                        <Text style={styles.topProductName} numberOfLines={2} ellipsizeMode="tail">
                          {product.name}
                        </Text>
                        <Text style={styles.topProductRevenue}>
                          {formatCurrency(product.revenue)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                
                {analytics.peakHours.length > 0 && (
                  <View style={styles.peakHoursSection}>
                    <Text style={styles.premiumSectionTitle}>Horários de Pico</Text>
                    <View style={styles.peakHoursGrid}>
                      {analytics.peakHours.slice(0, 3).map((hour, index) => (
                        <View key={index} style={styles.peakHourItem}>
                          <Text style={styles.peakHourTime}>{hour.hour}</Text>
                          <Text style={styles.peakHourOrders}>{hour.orders} pedidos</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                
                {/* Gráficos Premium */}
                <PremiumCharts analytics={analytics} />
              </View>
            ) : (
              <>
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
                  <Text style={styles.premiumFeature}>• Análise de produtos</Text>
                  <Text style={styles.premiumFeature}>• Horários de pico</Text>
                </View>
              </>
            )}
          </View>
        </View>


        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Métricas do Mês</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{financialData?.totalOrders || 0}</Text>
              <Text style={styles.metricLabel}>Pedidos Válidos</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>
                {formatCurrency(financialData?.averageTicket || 0)}
              </Text>
              <Text style={styles.metricLabel}>Ticket Médio</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>
                {formatPercentage(financialData?.deliveryRate || 0)}
              </Text>
              <Text style={styles.metricLabel}>Taxa de Entrega</Text>
            </View>
          </View>
          
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{financialData?.orderStats?.total || 0}</Text>
              <Text style={styles.metricLabel}>Total de Pedidos</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={[styles.metricValue, styles.cancelledValue]}>
                {financialData?.cancelledOrders?.total || 0}
              </Text>
              <Text style={[styles.metricLabel, styles.cancelledLabel]}>Cancelados</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={[styles.metricValue, styles.cancelledValue]}>
                {formatPercentage(financialData?.cancelledOrders?.percentage || 0)}
              </Text>
              <Text style={[styles.metricLabel, styles.cancelledLabel]}>Taxa Cancelamento</Text>
            </View>
          </View>
        </View>

        {financialData?.cancelledOrders && financialData.cancelledOrders.total > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Impacto dos Cancelamentos</Text>
            <View style={styles.card}>
              <View style={styles.cancelledStatsContainer}>
                <View style={styles.cancelledStatItem}>
                  <Text style={styles.cancelledStatValue}>
                    {financialData?.cancelledOrders?.total || 0}
                  </Text>
                  <Text style={styles.cancelledStatLabel}>Pedidos Cancelados</Text>
                </View>
                <View style={styles.cancelledStatItem}>
                  <Text style={styles.cancelledStatValue}>
                    {formatPercentage(financialData?.cancelledOrders?.percentage || 0)}
                  </Text>
                  <Text style={styles.cancelledStatLabel}>Taxa de Cancelamento</Text>
                </View>
              </View>
              
              <View style={styles.lostRevenueContainer}>
                <Text style={styles.lostRevenueLabel}>Receita Perdida</Text>
                <Text style={styles.lostRevenueValue}>
                  {formatCurrency(financialData?.cancelledOrders?.lostRevenue || 0)}
                </Text>
              </View>
            </View>
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
  scrollContent: {
    flex: 1,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.gray[600],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.red[600],
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: colors.gray[600],
    marginTop: 8,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: 20,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    color: colors.gray[600],
    flex: 1,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  positiveGrowth: {
    backgroundColor: colors.green[500],
  },
  negativeGrowth: {
    backgroundColor: colors.red[500],
  },
  growthText: {
    fontSize: 12,
    color: colors.white,
    fontWeight: '600',
  },
  amount: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.gray[800],
    marginBottom: 12,
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
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: colors.purple[50],
    borderRadius: 12,
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
    marginTop: 12,
    padding: 16,
    backgroundColor: colors.gray[100],
    borderRadius: 12,
  },
  feeText: {
    fontSize: 14,
    color: colors.gray[600],
  },
  netAmountText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray[800],
    marginTop: 6,
  },
  premiumCard: {
    borderWidth: 1,
    borderColor: colors.purple[100],
    backgroundColor: colors.white,
  },
  premiumContent: {
    marginTop: 16,
  },

  premiumSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: 12,
  },
  topProductsSection: {
    marginBottom: 20,
  },
  topProductItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    minHeight: 40,
  },
  topProductName: {
    fontSize: 14,
    color: colors.gray[700],
    flex: 1,
    marginRight: 12,
    lineHeight: 18,
  },
  topProductRevenue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[800],
    textAlign: 'right',
    minWidth: 80,
  },
  peakHoursSection: {
    marginBottom: 16,
  },
  peakHoursGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  peakHourItem: {
    alignItems: 'center',
  },
  peakHourTime: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[800],
  },
  peakHourOrders: {
    fontSize: 12,
    color: colors.gray[600],
  },
  premiumFeaturesList: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.purple[100],
  },
  premiumFeature: {
    fontSize: 14,
    color: colors.gray[600],
    marginBottom: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 18,
    borderRadius: 16,
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
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.gray[600],
    textAlign: 'center',
    fontWeight: '500',
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  paymentMethodCard: {
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
  paymentMethodValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray[800],
    marginTop: 8,
    marginBottom: 4,
  },
  paymentMethodLabel: {
    fontSize: 12,
    color: colors.gray[600],
    textAlign: 'center',
  },
  orderStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  orderStatItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  orderStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[800],
    marginBottom: 4,
  },
  orderStatLabel: {
    fontSize: 12,
    color: colors.gray[600],
    textAlign: 'center',
  },
  cancelledStat: {
    borderLeftWidth: 1,
    borderLeftColor: colors.gray[200],
  },
  cancelledValue: {
    color: colors.red[600],
  },
  cancelledLabel: {
    color: colors.red[600],
  },
  cancelledInfo: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  cancelledTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: 12,
  },
  cancelledDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelledDetailItem: {
    flex: 1,
    alignItems: 'center',
  },
  cancelledDetailLabel: {
    fontSize: 12,
    color: colors.gray[600],
    marginBottom: 4,
  },
  cancelledDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.red[600],
  },
  cancelledStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  cancelledStatItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  cancelledStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.red[600],
    marginBottom: 8,
  },
  cancelledStatLabel: {
    fontSize: 13,
    color: colors.red[600],
    textAlign: 'center',
    fontWeight: '500',
  },
  lostRevenueContainer: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.red[100],
  },
  lostRevenueLabel: {
    fontSize: 14,
    color: colors.gray[600],
    marginBottom: 8,
  },
  lostRevenueValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.red[600],
  },
}); 