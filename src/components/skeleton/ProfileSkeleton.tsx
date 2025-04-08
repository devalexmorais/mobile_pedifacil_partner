import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SkeletonItem } from './SkeletonItem';

/**
 * Componente de skeleton para a tela de perfil
 */
export const ProfileSkeleton = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.coverImage, styles.skeletonBackground]}>
          <SkeletonItem 
            width={100} 
            height={100} 
            style={{ 
              borderRadius: 50, 
              borderWidth: 3, 
              borderColor: '#FFF', 
              marginBottom: 10 
            }} 
          />
          <SkeletonItem width={180} height={24} style={{ marginBottom: 5 }} />
          <SkeletonItem width={150} height={16} />
        </View>
      </View>

      <View style={styles.cardsContainer}>
        {/* Skeleton: Informações Pessoais */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <SkeletonItem width={24} height={24} style={{ borderRadius: 12 }} />
            <SkeletonItem width={150} height={18} style={{ marginLeft: 10 }} />
          </View>
          <View style={styles.cardContent}>
            {[1, 2, 3, 4].map((item) => (
              <View key={`personal-${item}`} style={styles.skeletonFieldContainer}>
                <SkeletonItem width={80} height={14} />
                <SkeletonItem width="70%" height={16} style={{ marginTop: 6 }} />
              </View>
            ))}
          </View>
        </View>

        {/* Skeleton: Endereço */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <SkeletonItem width={24} height={24} style={{ borderRadius: 12 }} />
            <SkeletonItem width={120} height={18} style={{ marginLeft: 10 }} />
          </View>
          <View style={styles.cardContent}>
            {[1, 2, 3, 4, 5].map((item) => (
              <View key={`address-${item}`} style={styles.skeletonFieldContainer}>
                <SkeletonItem width={80} height={14} />
                <SkeletonItem width="70%" height={16} style={{ marginTop: 6 }} />
              </View>
            ))}
          </View>
        </View>

        {/* Skeleton: Estabelecimento */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <SkeletonItem width={24} height={24} style={{ borderRadius: 12 }} />
            <SkeletonItem width={140} height={18} style={{ marginLeft: 10 }} />
          </View>
          <View style={styles.cardContent}>
            {[1, 2, 3].map((item) => (
              <View key={`store-${item}`} style={styles.skeletonFieldContainer}>
                <SkeletonItem width={80} height={14} />
                <SkeletonItem width="70%" height={16} style={{ marginTop: 6 }} />
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    height: 250,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFA500',
  },
  skeletonBackground: {
    backgroundColor: '#E0E0E0',
  },
  cardsContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cardContent: {
    padding: 16,
  },
  skeletonFieldContainer: {
    marginBottom: 16,
  },
}); 