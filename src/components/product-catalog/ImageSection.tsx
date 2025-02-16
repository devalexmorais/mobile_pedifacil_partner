import React from 'react';
import { View, Image, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/styles/theme/colors';

interface ImageSectionProps {
  image: string | undefined;
  onImagePick: () => void;
}

export function ImageSection({ image, onImagePick }: ImageSectionProps) {
  return (
    <View style={styles.container}>
      {image ? (
        <View style={styles.imagePreviewContainer}>
          <Image 
            source={{ uri: image }} 
            style={styles.imagePreview} 
          />
          <TouchableOpacity 
            style={styles.removeImageButton}
            onPress={onImagePick}
          >
            <Ionicons name="camera" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.imagePickerButton}
          onPress={onImagePick}
        >
          <Ionicons name="camera-outline" size={24} color={colors.orange} />
          <Text style={styles.imagePickerText}>Adicionar Foto do Produto</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  imagePreviewContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: colors.orange,
    borderRadius: 24,
    padding: 8,
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray[100],
    padding: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.gray[300],
  },
  imagePickerText: {
    marginLeft: 8,
    color: colors.orange,
    fontSize: 16,
    fontWeight: '500',
  },
}); 