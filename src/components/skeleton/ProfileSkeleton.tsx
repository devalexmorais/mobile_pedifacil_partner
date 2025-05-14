import React, { memo } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { SkeletonItem } from './SkeletonItem';

// Componente reutilizável para cada seção do perfil
const ProfileSection = memo(({ index }: { index: number }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <SkeletonItem width={24} height={24} style={{ borderRadius: 12 }} shimmerEnabled={index === 0} />
      <SkeletonItem 
        width={120 + (index * 20)} 
        height={18} 
        style={{ marginLeft: 10 }} 
        shimmerEnabled={index === 0}
      />
    </View>
    <View style={styles.sectionContent}>
      <SkeletonItem width={80} height={14} shimmerEnabled={false} />
      <SkeletonItem 
        width="70%" 
        height={16} 
        style={{ marginTop: 6 }} 
        shimmerEnabled={false}
      />
    </View>
  </View>
));

/**
 * Componente de skeleton otimizado para a tela de perfil
 */
export const ProfileSkeleton = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <SkeletonItem
            width={100}
            height={100}
            style={{
              borderRadius: 50,
              marginBottom: 15,
            }}
          />
          <SkeletonItem width={180} height={24} style={{ marginBottom: 5 }} />
          <SkeletonItem width={150} height={16} shimmerEnabled={false} />
        </View>

        <View style={styles.content}>
          {/* Componentes de seção memoizados */}
          <ProfileSection index={0} />
          <ProfileSection index={1} />
          <ProfileSection index={2} />
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
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  sectionContent: {
    marginTop: 16,
  },
}); 