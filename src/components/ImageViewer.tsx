import React from 'react';
import { StyleSheet, Image, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ImageViewerProps {
  placeholderImageSource: any;
  selectedImage: string | null;
}

export default function ImageViewer({ placeholderImageSource, selectedImage }: ImageViewerProps) {
  if (selectedImage) {
    return <Image source={{ uri: selectedImage }} style={styles.image} />;
  }
  
  return (
    <View style={styles.placeholderContainer}>
      <Ionicons name="image" size={48} color="#666" />
      <Text style={styles.placeholderText}>Adicionar Imagem</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
  },
  placeholderText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
});
