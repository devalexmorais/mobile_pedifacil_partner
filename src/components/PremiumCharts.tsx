import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { colors } from '../styles/theme/colors';
import { MonthlyComparison, PremiumAnalytics } from '../hooks/usePremiumAnalytics';

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - 80; // Garante que sempre caiba na tela
const pieChartWidth = Math.min(screenWidth - 80, 280); // Largura controlada para respeitar área com margem

interface PremiumChartsProps {
  analytics: PremiumAnalytics;
}

export default function PremiumCharts({ analytics }: PremiumChartsProps) {
  const chartConfig = {
    backgroundGradientFrom: colors.white,
    backgroundGradientTo: colors.white,
    color: (opacity = 1) => `rgba(147, 51, 234, ${opacity})`, // purple
    strokeWidth: 2,
    barPercentage: 0.7,
    useShadowColorFromDataset: false,
  };

  // Verificar se há dados suficientes
  const hasMonthlyData = analytics.monthlyComparison.length > 0;
  const hasPaymentData = analytics.paymentMethodTrends.length > 0;
  const hasProductData = analytics.topProducts.length >= 2; // Precisa de pelo menos 2 produtos

  // Dados para gráfico de linha (comparativo mensal)
  const monthlyRevenues = analytics.monthlyComparison.map(month => Math.max(month.revenue, 0));
  const monthlyData = {
    labels: analytics.monthlyComparison.length > 0 
      ? analytics.monthlyComparison.map(month => month.month)
      : ['Mês 1', 'Mês 2', 'Mês 3'],
    datasets: [
      {
        data: monthlyRevenues.length > 0 ? monthlyRevenues : [0, 0, 0],
        color: (opacity = 1) => `rgba(147, 51, 234, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  // Dados para gráfico de barras (métodos de pagamento)
  const paymentPercentages = analytics.paymentMethodTrends.map(method => Math.max(method.percentage, 0));
  const paymentMethodData = {
    labels: analytics.paymentMethodTrends.length > 0 
      ? analytics.paymentMethodTrends.map(method => method.method)
      : ['Dinheiro', 'Cartão', 'PIX'],
    datasets: [
      {
        data: paymentPercentages.length > 0 ? paymentPercentages : [0, 0, 0],
      },
    ],
  };

  // Dados para gráfico de pizza (produtos mais vendidos) - limitado a 3 produtos
  const formatProductName = (name: string) => {
    // Se o nome é curto, manter original
    if (name.length <= 10) return name;
    
    // Tentar quebrar em duas linhas por palavras
    const words = name.split(' ');
    if (words.length >= 2) {
      // Encontrar melhor ponto de quebra
      let bestBreak = Math.floor(words.length / 2);
      
      // Ajustar para equilibrar as linhas
      for (let i = 1; i < words.length; i++) {
        const firstPart = words.slice(0, i).join(' ');
        const secondPart = words.slice(i).join(' ');
        
        if (firstPart.length <= 10 && secondPart.length <= 10) {
          return `${firstPart}\n${secondPart}`;
        }
      }
      
      // Se não conseguir equilibrar, quebrar no meio
      const mid = Math.ceil(words.length / 2);
      const firstLine = words.slice(0, mid).join(' ');
      const secondLine = words.slice(mid).join(' ');
      
      if (firstLine.length <= 14 && secondLine.length <= 14) {
        return `${firstLine}\n${secondLine}`;
      }
    }
    
    // Quebra forçada por caracteres se necessário
    if (name.length > 12) {
      const mid = Math.floor(name.length / 2);
      const spaceIndex = name.indexOf(' ', mid - 3);
      
      if (spaceIndex > 0 && spaceIndex < mid + 3) {
        return `${name.substring(0, spaceIndex)}\n${name.substring(spaceIndex + 1)}`;
      }
      
      // Último recurso: truncar
      return name.substring(0, 12) + '...';
    }
    
    return name;
  };

  const topProductsData = analytics.topProducts.slice(0, 3).map((product, index) => ({
    name: formatProductName(product.name),
    revenue: product.revenue,
    color: [
      colors.purple[500],
      colors.blue[500],
      colors.green[500],
    ][index],
    legendFontColor: colors.gray[700],
    legendFontSize: 11,
  }));

  return (
    <View style={styles.container}>
      {/* Gráfico de Crescimento Mensal */}
      {hasMonthlyData && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Crescimento Mensal</Text>
          <View style={styles.chartWrapper}>
            <LineChart
              data={monthlyData}
              width={chartWidth}
              height={160}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              withDots={true}
              withInnerLines={false}
              withOuterLines={false}
              withVerticalLines={false}
              withHorizontalLines={true}
              formatYLabel={(value) => `R$ ${(parseFloat(value) / 1000).toFixed(0)}k`}
            />
          </View>
        </View>
      )}

      {/* Gráfico de Métodos de Pagamento */}
      {hasPaymentData && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Métodos de Pagamento (%)</Text>
          <View style={styles.chartWrapper}>
            <BarChart
              data={paymentMethodData}
              width={chartWidth}
              height={160}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`, // green
              }}
              style={styles.chart}
              verticalLabelRotation={0}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              withInnerLines={false}
              showValuesOnTopOfBars={true}
              yAxisLabel=""
              yAxisSuffix=""
            />
          </View>
        </View>
      )}

      {/* Gráfico de Produtos Mais Vendidos */}
      {hasProductData && (
        <View style={[styles.chartContainer, styles.pieChartContainer]}>
          <Text style={styles.chartTitle}>Produtos Mais Vendidos</Text>
          <View style={[styles.chartWrapper, styles.pieChartWrapper]}>
            <View style={styles.pieChartInner}>
              <PieChart
                data={topProductsData}
                width={pieChartWidth}
                height={200}
                chartConfig={chartConfig}
                accessor="revenue"
                backgroundColor="transparent"
                paddingLeft="15"
                style={styles.chart}
                absolute
                hasLegend={true}
                avoidFalseZero={true}
              />
            </View>
          </View>
        </View>
      )}
      
      {/* Exibir mensagem quando não há dados suficientes */}
      {!hasMonthlyData && !hasPaymentData && !hasProductData && (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>
            Dados insuficientes para exibir gráficos. Complete mais pedidos para ver análises avançadas.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  chartContainer: {
    marginBottom: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: 12,
    textAlign: 'center',
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  chart: {
    borderRadius: 8,
  },
  noDataContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 14,
    color: colors.gray[600],
  },
  pieChartContainer: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    minHeight: 260,
  },
  pieChartWrapper: {
    paddingHorizontal: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  pieChartInner: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
    maxWidth: 320,
    paddingHorizontal: 10,
  },
}); 