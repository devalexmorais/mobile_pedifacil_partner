import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '@/styles/theme/colors';
import { Ionicons } from '@expo/vector-icons';

export default function Checkout() {
  return (
    <View style={styles.container}>
      
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <View style={styles.planBadge}>
            <Ionicons name="diamond" size={24} color={colors.purple[500]} />
            <Text style={styles.planName}>Plano Premium</Text>
          </View>
          <Text style={styles.price}>R$ 89,90/mês</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Forma de Pagamento</Text>
          {/* Implementar seleção de forma de pagamento */}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo</Text>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Plano Premium (mensal)</Text>
            <Text style={styles.summaryValue}>R$ 89,90</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>R$ 89,90</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.confirmButton}>
          <Text style={styles.confirmButtonText}>Confirmar Assinatura</Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: colors.white,
    padding: 24,
    alignItems: 'center',
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  planName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.gray[800],
  },
  price: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.purple[500],
  },
  section: {
    backgroundColor: colors.white,
    padding: 24,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: colors.gray[600],
  },
  summaryValue: {
    fontSize: 16,
    color: colors.gray[800],
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[200],
    marginVertical: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[800],
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.purple[500],
  },
  footer: {
    backgroundColor: colors.white,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  confirmButton: {
    backgroundColor: colors.purple[500],
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
}); 