import React, { useState} from 'react';
import { View, StyleSheet, ActivityIndicator, Image } from 'react-native';
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

// Cache global para imagens já carregadas
const imageCache = new Map<string, { loaded: boolean; error: boolean }>();

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  uri,
  defaultImage,
  style,
  borderRadius = 0,
  lazy = false,
  shouldLoad = true,
  onLoad,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(() => {
    // Verifica se a imagem já foi carregada anteriormente
    if (uri && imageCache.has(uri)) {
      const cached = imageCache.get(uri)!;
      return !cached.loaded;
    }
    return true;
  });
  
  const [hasError, setHasError] = useState(() => {
    // Verifica se a imagem já teve erro anteriormente
    if (uri && imageCache.has(uri)) {
      const cached = imageCache.get(uri)!;
      return cached.error;
    }
    return false;
  });

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    
    // Salva no cache que a imagem foi carregada com sucesso
    if (uri) {
      imageCache.set(uri, { loaded: true, error: false });
    }
    
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    
    // Salva no cache que a imagem teve erro
    if (uri) {
      imageCache.set(uri, { loaded: false, error: true });
    }
    
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

  // Se a imagem já foi carregada anteriormente, mostra diretamente
  const cached = imageCache.get(uri);
  if (cached && cached.loaded) {
    return (
      <View style={[style, { borderRadius }]}>
        <Image
          source={{ uri: uri }}
          style={[style, { borderRadius }]}
          resizeMode="cover"
          fadeDuration={0}
        />
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
        fadeDuration={0}
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