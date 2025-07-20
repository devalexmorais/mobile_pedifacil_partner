import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface SkeletonItemProps {
  width: number | string;
  height: number;
  style?: any;
  shimmerEnabled?: boolean;
}

/**
 * Componente de skeleton com animação de shimmer para carregamento
 */
export const SkeletonItem = ({ 
  width, 
  height, 
  style, 
  shimmerEnabled = true 
}: SkeletonItemProps) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (shimmerEnabled) {
      // Paramos qualquer animação anterior antes de iniciar uma nova
      animatedValue.stopAnimation();
      
      // Criamos a animação com apenas uma vez a cada 2 segundos
      Animated.loop(
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true, // Usar nativeDriver para melhor performance
        })
      ).start();
    }
    
    return () => {
      // Limpeza da animação quando o componente é desmontado
      animatedValue.stopAnimation();
    };
  }, [shimmerEnabled]);

  // Criamos a animação de forma otimizada
  // Convertemos width para número se for string, ou usamos um valor padrão
  const numericWidth = typeof width === 'number' ? width : 100;
  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-numericWidth * 2, numericWidth * 2],
  });

  return (
    <View style={[styles.skeletonItem, { width, height }, style]}>
      {shimmerEnabled && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.shimmer,
            {
              transform: [{ translateX }],
            },
          ]}
        />
      )}
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
    width: '70%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    opacity: 0.5,
  },
}); 