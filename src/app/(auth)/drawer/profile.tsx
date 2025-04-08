import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, TouchableOpacity, Alert, ImageBackground } from 'react-native';
import { doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../config/firebase';
import { Ionicons } from '@expo/vector-icons';
import { Auth, getAuth } from 'firebase/auth';
import { EditableField } from '../../../components/EditableField';
import * as ImagePicker from 'expo-image-picker';
import { ProfileSkeleton } from '../../../components/skeleton';

// Inicializar auth com tipagem correta
const auth: Auth = getAuth();

interface PartnerData {
  name: string;
  email: string;
  phone: string;
  address: {
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  store: {
    name: string;
    document: string;
    category: string;
    subcategory: string;
    logo: string;
  };
  isActive: boolean;
  status: string;
  createdAt: any;
  updatedAt: any;
  lastUpdated: string;
  role: string;
  coverImage?: string;
}

interface LocationData {
  neighborhood: string;
  city: string;
  state: string;
}

interface CategoryData {
  category: string;
  subcategory: string;
}

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [partnerData, setPartnerData] = useState<PartnerData | null>(null);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [categoryData, setCategoryData] = useState<CategoryData | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadLocationData = async (address: any) => {
    try {
      // Buscar estado
      const stateRef = doc(db, 'states', address.state);
      const stateDoc = await getDoc(stateRef);
      const stateName = stateDoc.data()?.name || '';

      // Buscar cidade
      const cityRef = doc(db, 'states', address.state, 'cities', address.city);
      const cityDoc = await getDoc(cityRef);
      const cityName = cityDoc.data()?.name || '';

      // Buscar bairro
      const neighborhoodRef = doc(db, 'states', address.state, 'cities', address.city, 'neighborhoods', address.neighborhood);
      const neighborhoodDoc = await getDoc(neighborhoodRef);
      const neighborhoodName = neighborhoodDoc.data()?.name || '';

      setLocationData({
        state: stateName,
        city: cityName,
        neighborhood: neighborhoodName
      });
    } catch (error) {
      console.error('Erro ao carregar dados de localização:', error);
    }
  };

  const loadCategoryData = async (store: any) => {
    try {
      // Buscar categoria
      const categoryRef = doc(db, 'categories', store.category);
      const categoryDoc = await getDoc(categoryRef);
      const categoryName = categoryDoc.data()?.name || '';

      // Buscar subcategoria
      const subcategoryRef = doc(db, 'categories', store.category, 'subcategories', store.subcategory);
      const subcategoryDoc = await getDoc(subcategoryRef);
      const subcategoryName = subcategoryDoc.data()?.name || '';

      setCategoryData({
        category: categoryName,
        subcategory: subcategoryName
      });
    } catch (error) {
      console.error('Erro ao carregar dados de categoria:', error);
    }
  };

  const loadPartnerData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');

      const partnerRef = doc(db, 'partners', user.uid);
      const partnerDoc = await getDoc(partnerRef);

      if (partnerDoc.exists()) {
        const data = partnerDoc.data();
        setPartnerData(data as PartnerData);

        // Carregar dados de localização e categoria
        await Promise.all([
          loadLocationData(data.address),
          loadCategoryData(data.store)
        ]);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePartnerField = async (field: string, value: string) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');

      const partnerRef = doc(db, 'partners', user.uid);
      await updateDoc(partnerRef, { [field]: value });

      // Atualizar estado local
      setPartnerData(prev => prev ? { ...prev, [field]: value } : null);
    } catch (error) {
      console.error('Erro ao atualizar campo:', error);
      throw error;
    }
  };

  const updateStoreField = async (field: string, value: string) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');

      const partnerRef = doc(db, 'partners', user.uid);
      await updateDoc(partnerRef, { [`store.${field}`]: value });

      // Atualizar estado local
      setPartnerData(prev => prev ? {
        ...prev,
        store: { ...prev.store, [field]: value }
      } : null);
    } catch (error) {
      console.error('Erro ao atualizar campo da loja:', error);
      throw error;
    }
  };

  const updateAddressField = async (field: string, value: string) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');

      const partnerRef = doc(db, 'partners', user.uid);
      await updateDoc(partnerRef, { [`address.${field}`]: value });

      // Atualizar estado local
      setPartnerData(prev => prev ? {
        ...prev,
        address: { ...prev.address, [field]: value }
      } : null);
    } catch (error) {
      console.error('Erro ao atualizar endereço:', error);
      throw error;
    }
  };

  const uploadImageToStorage = async (uri: string, path: string): Promise<string> => {
    try {
      // Converter URI em blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Criar referência no Storage
      const storageRef = ref(storage, path);
      
      // Fazer upload
      await uploadBytes(storageRef, blob);
      
      // Obter URL de download
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      throw error;
    }
  };

  const handleImageUpload = async () => {
    try {
      setUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        const user = auth.currentUser;
        if (!user) throw new Error('Usuário não autenticado');

        // Caminho fixo para a foto de perfil (sempre substituirá a existente)
        const storagePath = `partners/${user.uid}/profile/profile.jpg`;
        const downloadURL = await uploadImageToStorage(result.assets[0].uri, storagePath);

        const partnerRef = doc(db, 'partners', user.uid);
        await updateDoc(partnerRef, {
          'store.logo': downloadURL
        });

        setPartnerData(prev => prev ? {
          ...prev,
          store: {
            ...prev.store,
            logo: downloadURL
          }
        } : null);
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível fazer upload da imagem');
    } finally {
      setUploading(false);
    }
  };

  const handleCoverImageUpload = async () => {
    try {
      setUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.5,
      });

      if (!result.canceled) {
        const user = auth.currentUser;
        if (!user) throw new Error('Usuário não autenticado');

        // Caminho fixo para a foto de capa (sempre substituirá a existente)
        const storagePath = `partners/${user.uid}/cover/cover.jpg`;
        const downloadURL = await uploadImageToStorage(result.assets[0].uri, storagePath);

        const partnerRef = doc(db, 'partners', user.uid);
        await updateDoc(partnerRef, {
          coverImage: downloadURL
        });

        setPartnerData(prev => prev ? {
          ...prev,
          coverImage: downloadURL
        } : null);
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem de capa:', error);
      Alert.alert('Erro', 'Não foi possível fazer upload da imagem de capa');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    loadPartnerData();
  }, []);

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (!partnerData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Erro ao carregar dados do perfil</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <ImageBackground
          source={partnerData.coverImage ? { uri: partnerData.coverImage } : undefined}
          style={styles.coverImage}
        >
          <TouchableOpacity 
            style={styles.editCoverButton}
            onPress={handleCoverImageUpload}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="image" size={20} color="#FFF" />
            )}
          </TouchableOpacity>

          <View style={styles.profileImageContainer}>
            <Image
              source={partnerData.store.logo ? 
                { uri: partnerData.store.logo } : 
                require('../../../assets/logo.png')
              }
              style={styles.profileImage}
            />
            <TouchableOpacity 
              style={styles.editImageButton}
              onPress={handleImageUpload}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="camera" size={20} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.storeName}>{partnerData?.store.name}</Text>
          <Text style={styles.email}>{partnerData?.email}</Text>
        </ImageBackground>
      </View>

      <View style={styles.cardsContainer}>
        {/* Card de Informações Pessoais */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person" size={24} color="#FFA500" />
            <Text style={styles.cardTitle}>Informações Pessoais</Text>
          </View>
          <View style={styles.cardContent}>
            <EditableField
              label="Nome"
              value={partnerData.name}
              onSave={(value) => updatePartnerField('name', value)}
            />
            <EditableField
              label="Email"
              value={partnerData.email}
              editable={false}
            />
            <EditableField
              label="Telefone"
              value={partnerData.phone}
              onSave={(value) => updatePartnerField('phone', value)}
            />
            <EditableField
              label="Documento"
              value={partnerData.store.document}
              editable={false}
            />
          </View>
        </View>

        {/* Card de Endereço */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location" size={24} color="#FFA500" />
            <Text style={styles.cardTitle}>Endereço</Text>
          </View>
          <View style={styles.cardContent}>
            <EditableField
              label="Rua"
              value={partnerData.address.street}
              onSave={(value) => updateAddressField('street', value)}
            />
            <EditableField
              label="Número"
              value={partnerData.address.number}
              onSave={(value) => updateAddressField('number', value)}
            />
            <EditableField
              label="Complemento"
              value={partnerData.address.complement}
              onSave={(value) => updateAddressField('complement', value)}
            />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Bairro:</Text>
              <Text style={styles.infoValue}>{locationData?.neighborhood || 'Carregando...'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Cidade/UF:</Text>
              <Text style={styles.infoValue}>
                {locationData ? `${locationData.city}/${locationData.state}` : 'Carregando...'}
              </Text>
            </View>
          </View>
        </View>

        {/* Card do Estabelecimento */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="business" size={24} color="#FFA500" />
            <Text style={styles.cardTitle}>Estabelecimento</Text>
          </View>
          <View style={styles.cardContent}>
            <EditableField
              label="Nome"
              value={partnerData.store.name}
              onSave={(value) => updateStoreField('name', value)}
            />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Categoria:</Text>
              <Text style={styles.infoValue}>{categoryData?.category || 'Carregando...'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Subcategoria:</Text>
              <Text style={styles.infoValue}>{categoryData?.subcategory || 'Carregando...'}</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    height: 250,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFA500',
  },
  editCoverButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 10,
    zIndex: 2,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  editImageButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#FFA500',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    zIndex: 3,
  },
  storeName: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  email: {
    color: '#FFF',
    fontSize: 16,
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  cardsContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#333',
  },
  cardContent: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  infoLabel: {
    width: 100,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 16,
  },
}); 