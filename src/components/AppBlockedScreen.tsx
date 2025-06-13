import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/styles/theme/colors';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

interface AppBlockedScreenProps {
  dueAmount: number;
  dueDate: string;
  suspensionReason?: string;
  blockedSince?: string;
  overdueCount?: number;
  daysOverdue?: number;
}

export function AppBlockedScreen({ 
  dueAmount, 
  dueDate, 
  suspensionReason,
  blockedSince,
  overdueCount = 0,
  daysOverdue = 0
}: AppBlockedScreenProps) {
  const router = useRouter();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleGoToPayment = () => {
    router.push('/faturas');
  };

  const getBloackSeverityInfo = () => {
    if (daysOverdue >= 15) {
      return {
        icon: 'skull',
        color: colors.red[700],
        title: 'Conta Suspensa Definitivamente',
        description: 'Sua conta foi suspensa por falta de pagamento há muito tempo.'
      };
    } else if (daysOverdue >= 7) {
      return {
        icon: 'lock-closed',
        color: colors.red[600],
        title: 'App Bloqueado por Pagamento',
        description: 'O app foi bloqueado após 7 dias de atraso no pagamento.'
      };
    } else {
      return {
        icon: 'warning',
        color: colors.orange,
        title: 'Bloqueio Temporário',
        description: 'Bloqueio aplicado por política de cobrança.'
      };
    }
  };

  const blockInfo = getBloackSeverityInfo();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.red[600]} barStyle="light-content" />
      
      <LinearGradient
        colors={[colors.red[600], colors.red[700]]}
        style={styles.header}
      >
        <MaterialCommunityIcons 
          name={blockInfo.icon as any} 
          size={80} 
          color={colors.white} 
        />
        <Text style={styles.headerTitle}>{blockInfo.title}</Text>
        <Text style={styles.headerSubtitle}>{blockInfo.description}</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Card de informações críticas */}
        <View style={styles.criticalCard}>
          <View style={styles.criticalHeader}>
            <Ionicons name="alert-circle" size={24} color={colors.red[600]} />
            <Text style={styles.criticalTitle}>Situação Crítica</Text>
          </View>
          
          <Text style={styles.criticalText}>
            Seu aplicativo está <Text style={styles.bold}>completamente bloqueado</Text> devido a pagamentos em atraso. 
            Para continuar usando o PediFácil, você precisa regularizar seus pagamentos imediatamente.
          </Text>
        </View>

        {/* Detalhes do débito */}
        <View style={styles.debtCard}>
          <Text style={styles.debtCardTitle}>📋 Resumo do Débito</Text>
          
          <View style={styles.debtDetails}>
            {overdueCount > 0 && (
              <View style={styles.debtRow}>
                <Ionicons name="document-text" size={20} color={colors.red[600]} />
                <Text style={styles.debtLabel}>Faturas em atraso:</Text>
                <Text style={styles.debtValue}>{overdueCount}</Text>
              </View>
            )}

            {dueAmount > 0 && (
              <View style={styles.debtRow}>
                <Ionicons name="card" size={20} color={colors.red[600]} />
                <Text style={styles.debtLabel}>Valor total:</Text>
                <Text style={[styles.debtValue, styles.debtAmount]}>{formatCurrency(dueAmount)}</Text>
              </View>
            )}

            {daysOverdue > 0 && (
              <View style={styles.debtRow}>
                <Ionicons name="time" size={20} color={colors.red[600]} />
                <Text style={styles.debtLabel}>Dias em atraso:</Text>
                <Text style={styles.debtValue}>{daysOverdue} dias</Text>
              </View>
            )}

            {dueDate && (
              <View style={styles.debtRow}>
                <Ionicons name="calendar" size={20} color={colors.red[600]} />
                <Text style={styles.debtLabel}>Vencimento:</Text>
                <Text style={styles.debtValue}>{dueDate}</Text>
              </View>
            )}

            {blockedSince && (
              <View style={styles.debtRow}>
                <Ionicons name="lock-closed" size={20} color={colors.red[600]} />
                <Text style={styles.debtLabel}>Bloqueado desde:</Text>
                <Text style={styles.debtValue}>{blockedSince}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Motivo da suspensão */}
        {suspensionReason && (
          <View style={styles.reasonCard}>
            <Text style={styles.reasonTitle}>⚖️ Motivo da Suspensão</Text>
            <Text style={styles.reasonText}>{suspensionReason}</Text>
          </View>
        )}

        {/* Consequências do bloqueio */}
        <View style={styles.consequencesCard}>
          <Text style={styles.consequencesTitle}>🚫 O que está bloqueado:</Text>
          
          <View style={styles.blockedFeatures}>
            <View style={styles.blockedFeature}>
              <Ionicons name="restaurant" size={20} color={colors.gray[500]} />
              <Text style={styles.blockedFeatureText}>Recebimento de pedidos</Text>
            </View>
            
            <View style={styles.blockedFeature}>
              <Ionicons name="analytics" size={20} color={colors.gray[500]} />
              <Text style={styles.blockedFeatureText}>Relatórios e estatísticas</Text>
            </View>
            
            <View style={styles.blockedFeature}>
              <Ionicons name="settings" size={20} color={colors.gray[500]} />
              <Text style={styles.blockedFeatureText}>Configurações da loja</Text>
            </View>
            
            <View style={styles.blockedFeature}>
              <Ionicons name="storefront" size={20} color={colors.gray[500]} />
              <Text style={styles.blockedFeatureText}>Gerenciamento de produtos</Text>
            </View>
          </View>
        </View>

        {/* Instruções */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>💡 Como reativar sua conta:</Text>
          
          <View style={styles.instructionsList}>
            <View style={styles.instruction}>
              <Text style={styles.instructionNumber}>1</Text>
              <Text style={styles.instructionText}>
                Clique no botão "Regularizar Pagamento" abaixo
              </Text>
            </View>
            
            <View style={styles.instruction}>
              <Text style={styles.instructionNumber}>2</Text>
              <Text style={styles.instructionText}>
                Escolha entre PIX (instantâneo) ou Boleto
              </Text>
            </View>
            
            <View style={styles.instruction}>
              <Text style={styles.instructionNumber}>3</Text>
              <Text style={styles.instructionText}>
                Efetue o pagamento de todas as faturas em atraso
              </Text>
            </View>
            
            <View style={styles.instruction}>
              <Text style={styles.instructionNumber}>4</Text>
              <Text style={styles.instructionText}>
                Sua conta será reativada automaticamente
              </Text>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Botão fixo de pagamento */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.payButton} onPress={handleGoToPayment}>
          <LinearGradient
            colors={[colors.green[500], colors.green[600]]}
            style={styles.payButtonGradient}
          >
            <MaterialCommunityIcons name="credit-card" size={24} color={colors.white} />
            <Text style={styles.payButtonText}>Regularizar Pagamento</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color={colors.white} />
          </LinearGradient>
        </TouchableOpacity>
        
        <Text style={styles.footerNote}>
          ⚡ Pagamento via PIX libera imediatamente
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  header: {
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
    marginTop: 16,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.white + 'CC',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  criticalCard: {
    backgroundColor: colors.red[50],
    borderLeftWidth: 4,
    borderLeftColor: colors.red[500],
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  criticalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  criticalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.red[700],
    marginLeft: 8,
  },
  criticalText: {
    fontSize: 14,
    color: colors.red[600],
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
  },
  debtCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  debtCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: 16,
  },
  debtDetails: {
    gap: 12,
  },
  debtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  debtLabel: {
    fontSize: 14,
    color: colors.gray[600],
    marginLeft: 8,
    flex: 1,
  },
  debtValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[800],
  },
  debtAmount: {
    color: colors.red[600],
    fontSize: 16,
  },
  reasonCard: {
    backgroundColor: colors.orange + '20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  reasonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: 8,
  },
  reasonText: {
    fontSize: 14,
    color: colors.gray[700],
    lineHeight: 18,
  },
  consequencesCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  consequencesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: 16,
  },
  blockedFeatures: {
    gap: 12,
  },
  blockedFeature: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  blockedFeatureText: {
    fontSize: 14,
    color: colors.gray[600],
    marginLeft: 12,
  },
  instructionsCard: {
    backgroundColor: colors.blue[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.blue[800],
    marginBottom: 16,
  },
  instructionsList: {
    gap: 12,
  },
  instruction: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  instructionNumber: {
    width: 24,
    height: 24,
    backgroundColor: colors.blue[600],
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: colors.blue[700],
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  payButton: {
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: colors.green[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  payButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 12,
  },
  payButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  footerNote: {
    fontSize: 12,
    color: colors.gray[600],
    textAlign: 'center',
  },
}); 