import { storage, auth } from '../config/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';

export const storageService = {
  async pickImage(): Promise<string | null> {
    try {
      // Verificar autenticação primeiro
      if (!auth.currentUser) {
        throw new Error('Usuário não autenticado');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
      }
      return null;
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      throw error;
    }
  },

  async uploadImage(uri: string): Promise<string> {
    try {
      // Verificar autenticação
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Converter URI para blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Validar tamanho (5MB)
      if (blob.size > 5 * 1024 * 1024) {
        throw new Error('Imagem muito grande. Máximo: 5MB');
      }

      // Validar tipo
      if (!blob.type.startsWith('image/')) {
        throw new Error('Arquivo deve ser uma imagem');
      }

      // Criar nome do arquivo
      const extension = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const timestamp = Date.now();
      const filename = `${timestamp}.${extension}`;
      const filePath = `products/${user.uid}/${filename}`;

      // Criar referência
      const storageRef = ref(storage, filePath);

      // Upload
      const uploadTask = await uploadBytesResumable(storageRef, blob);
      
      // Obter URL
      const downloadURL = await getDownloadURL(uploadTask.ref);
      return downloadURL;
    } catch (error) {
      console.error('Erro no upload:', error);
      throw error;
    }
  }
}; 