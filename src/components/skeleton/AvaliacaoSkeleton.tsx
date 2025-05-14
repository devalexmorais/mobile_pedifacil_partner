import React, { memo } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { SkeletonItem } from './SkeletonItem';
import { colors } from '@/styles/theme/colors';

// Componente memoizado para um item de avaliação
const AvaliacaoItem = memo(({ index }: { index: number }) => (
  <View style={styles.reviewCard}>
    <View style={styles.reviewHeader}>
      <SkeletonItem width={40} height={40} style={{ borderRadius: 20 }} shimmerEnabled={index === 0} />
      <View style={styles.reviewUser}>
        <SkeletonItem 
          width={120} 
          height={18} 
          style={{ marginBottom: 4 }} 
          shimmerEnabled={index === 0}
        />
        <View style={styles.reviewRating}>
          {[1, 2, 3, 4, 5].map((star) => (
            <SkeletonItem 
              key={`star-${star}`} 
              width={16} 
              height={14} 
              shimmerEnabled={false}
            />
          ))}
          <SkeletonItem 
            width={80} 
            height={12} 
            style={{ marginLeft: 8 }} 
            shimmerEnabled={false}
          />
        </View>
      </View>
    </View>
    <SkeletonItem 
      width="100%" 
      height={60} 
      style={{ marginTop: 12 }} 
      shimmerEnabled={false}
    />
  </View>
));

/**
 * Componente de skeleton otimizado para a tela de avaliações
 */
export const AvaliacaoSkeleton = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header com estatísticas */}
        <View style={styles.stats}>
          {/* Score médio */}
          <View style={styles.scoreCard}>
            <SkeletonItem width={80} height={50} style={{ marginBottom: 8 }} />
            <SkeletonItem
              width={100}
              height={12}
              style={{
                borderRadius: 6,
              }}
              shimmerEnabled={false}
            />
          </View>
          
          {/* Distribuição das avaliações */}
          <View style={styles.distributionCard}>
            <SkeletonItem width={120} height={16} style={{ marginTop: 8 }} />
            
            {[5, 4, 3, 2, 1].map((rating) => (
              <View key={`rating-${rating}`} style={styles.ratingRow}>
                <SkeletonItem width={16} height={14} shimmerEnabled={false} />
                <SkeletonItem
                  width={`${(6 - rating) * 20}%`}
                  height={8}
                  style={{
                    marginHorizontal: 8,
                    borderRadius: 4,
                  }}
                  shimmerEnabled={false}
                />
                <SkeletonItem width={32} height={14} shimmerEnabled={false} />
              </View>
            ))}
          </View>
        </View>
        
        {/* Título da seção de avaliações */}
        <View style={styles.reviewsHeader}>
          <SkeletonItem width={180} height={24} style={{ marginBottom: 16 }} />
        </View>
        
        {/* Lista de avaliações */}
        <View style={styles.reviewsList}>
          {[0, 1, 2, 3].map((index) => (
            <AvaliacaoItem key={`review-${index}`} index={index} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  stats: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
  },
  scoreCard: {
    width: '30%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: '#eee',
  },
  distributionCard: {
    flex: 1,
    paddingLeft: 16,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  reviewsHeader: {
    padding: 16,
    paddingBottom: 0,
  },
  reviewsList: {
    padding: 16,
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewUser: {
    flex: 1,
    marginLeft: 12,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
}); 