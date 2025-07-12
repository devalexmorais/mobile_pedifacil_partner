import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Image, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface OptimizedImageProps {
  uri: string | null;
  defaultImage?: string;
  style?: any;
  borderRadius?: number;
  lazy?: boolean;
  shouldLoad?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  uri,
  defaultImage,
  style,
  borderRadius = 0,
  lazy = false, // Desabilita lazy loading por padrão para evitar loops
  shouldLoad = true,
  onLoad,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  // Se não deve carregar, mostra loading
  if (!shouldLoad) {
    return (
      <View style={[style, styles.placeholder, { borderRadius }]}>
        <ActivityIndicator size="small" color="#ccc" />
      </View>
    );
  }

  // Se não há URI ou há erro, mostra ícone padrão
  if (!uri || hasError) {
    return (
      <View style={[style, styles.placeholder, { borderRadius }]}>
        <Ionicons name="image" size={24} color="#999" />
      </View>
    );
  }

  return (
    <View style={[style, { borderRadius }]}>
      {isLoading && (
        <View style={[StyleSheet.absoluteFill, styles.loadingContainer, { borderRadius }]}>
          <ActivityIndicator size="small" color="#ccc" />
        </View>
      )}
      <Image
        source={{ uri: uri }}
        style={[style, { borderRadius }]}
        onLoad={handleLoad}
        onError={handleError}
        resizeMode="cover"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
});

export default OptimizedImage; 