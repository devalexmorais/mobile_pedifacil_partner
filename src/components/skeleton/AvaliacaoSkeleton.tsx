import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SkeletonItem } from './SkeletonItem';
import { colors } from '@/styles/theme/colors';

/**
 * Componente skeleton para a tela de avaliações
 */
export const AvaliacaoSkeleton = () => {
  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Resumo das avaliações */}
        <View style={styles.summary}>
          <View style={styles.averageContainer}>
            <SkeletonItem width={80} height={50} style={{ marginBottom: 8 }} />
            
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((item) => (
                <SkeletonItem 
                  key={`star-${item}`} 
                  width={20} 
                  height={20} 
                  style={{ marginHorizontal: 2, borderRadius: 10 }} 
                />
              ))}
            </View>
            
            <SkeletonItem width={120} height={16} style={{ marginTop: 8 }} />
          </View>

          <View style={styles.ratingBars}>
            {[1, 2, 3, 4, 5].map((item) => (
              <View key={`rating-bar-${item}`} style={styles.ratingBar}>
                <SkeletonItem width={16} height={14} />
                <View style={styles.barContainer}>
                  <SkeletonItem 
                    width={`${Math.random() * 100}%`} 
                    height={8} 
                    style={{ borderRadius: 4 }} 
                  />
                </View>
                <SkeletonItem width={32} height={14} />
              </View>
            ))}
          </View>
        </View>

        {/* Título da seção */}
        <View style={styles.reviewsContainer}>
          <SkeletonItem width={180} height={24} style={{ marginBottom: 16 }} />

          {/* Reviews */}
          {[1, 2, 3].map((item) => (
            <View key={`review-${item}`} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View>
                  <SkeletonItem width={120} height={18} style={{ marginBottom: 4 }} />
                  <View style={styles.ratingContainer}>
                    <View style={{ flexDirection: 'row' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <SkeletonItem 
                          key={`review-star-${item}-${star}`} 
                          width={16} 
                          height={16} 
                          style={{ marginRight: 4, borderRadius: 8 }} 
                        />
                      ))}
                    </View>
                    <SkeletonItem width={80} height={12} style={{ marginLeft: 8 }} />
                  </View>
                </View>
              </View>
              
              <SkeletonItem width="100%" height={60} style={{ marginTop: 12 }} />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[100],
  },
  summary: {
    backgroundColor: colors.white,
    padding: 24,
    marginBottom: 12,
  },
  averageContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  ratingBars: {
    gap: 8,
  },
  ratingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.gray[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  reviewsContainer: {
    padding: 16,
  },
  reviewCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
}); 