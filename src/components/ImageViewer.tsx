import React from 'react';
import { StyleSheet, Image } from 'react-native';

interface ImageViewerProps {
  placeholderImageSource: any;
  selectedImage: string | null;
}

export default function ImageViewer({ placeholderImageSource, selectedImage }: ImageViewerProps) {
  const imageSource = selectedImage ? { uri: selectedImage } : placeholderImageSource;
  
  return <Image source={imageSource} style={styles.image} />;
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
});
