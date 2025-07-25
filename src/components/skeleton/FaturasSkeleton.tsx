import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonItem } from './SkeletonItem';

export function FaturasSkeleton() {
  return (
    <View style={styles.container}>
      <SkeletonItem height={80} width="100%" style={styles.header} />
      <SkeletonItem height={100} width="100%" style={styles.card} />
      <SkeletonItem height={100} width="100%" style={styles.card} />
      <SkeletonItem height={100} width="100%" style={styles.card} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  card: {
    marginBottom: 12,
    borderRadius: 8,
  },
}); 