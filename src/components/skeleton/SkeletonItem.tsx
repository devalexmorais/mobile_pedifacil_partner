import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface SkeletonItemProps {
  width: number | string;
  height: number;
  style?: any;
}

/**
 * Componente de skeleton com animação de shimmer para carregamento
 */
export const SkeletonItem = ({ width, height, style }: SkeletonItemProps) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: false,
      })
    ).start();
  }, []);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-350, 350],
  });

  return (
    <View style={[styles.skeletonItem, { width, height }, style]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [{ translateX }],
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
          },
          styles.shimmer,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  skeletonItem: {
    backgroundColor: '#BDBDBD',
    borderRadius: 4,
    overflow: 'hidden',
  },
  shimmer: {
    width: 50,
    height: '100%',
    opacity: 0.5,
  },
}); 