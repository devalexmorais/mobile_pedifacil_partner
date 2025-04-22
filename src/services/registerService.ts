import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { getAnalytics, logEvent, isSupported, Analytics } from 'firebase/analytics';
import { Platform } from 'react-native';

// Inicializar o analytics apenas se estiver em um ambiente compatível
let analytics: Analytics | null = null;
try {
  if (Platform.OS === 'web') {
    // Verificando isSupported de forma adequada
    isSupported().then(supported => {
      if (supported) {
        analytics = getAnalytics();
      }
    }).catch(() => {
      console.log('Analytics não verificável neste ambiente');
    });
  }
} catch (error) {
  console.log('Analytics não suportado neste ambiente');
}

interface RegisterData {
  // Dados pessoais
  name: string;
  email: string;
  password: string;
  phone: string;
  
  // Endereço
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  
  // Documentos
  storeName: string;
  category: string;
  subcategory: string;
  cnpj_or_cpf: string;
}

interface RegisterPartnerData {
  // Dados pessoais
  name: string;
  email: string;
  password: string;
  phone: string;
  
  // Dados do endereço
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  neighborhoodName?: string;
  city: string;
  cityName?: string;
  state: string;
  stateName?: string;
  
  // Dados do estabelecimento
  storeName: string;
  category: string;
  subcategory: string;
  cnpj_or_cpf: string;
  
  // Configurações
  delivery: string;
  pickup: string;
  paymentOptions: string;
  schedule: string;
}

const checkDocumentExists = async (document: string): Promise<boolean> => {
  const partnersRef = collection(db, 'partners');
  const q = query(
    partnersRef,
    where('store.document', '==', document)
  );

  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
};

export const registerService = {
  async registerPartner(data: RegisterPartnerData) {
    try {
      // Log dos dados recebidos
      console.log('Dados recebidos no registerService:', {
        email: data.email,
        name: data.name,
        phone: data.phone,
        // ... outros dados
      });

      // Validação mais detalhada
      if (!data.email?.trim()) {
        throw new Error('Email é obrigatório');
      }
      if (!data.password?.trim()) {
        throw new Error('Senha é obrigatória');
      }
      if (!data.name?.trim()) {
        throw new Error('Nome é obrigatório');
      }

      // Verificar se o documento já existe
      const documentExists = await checkDocumentExists(data.cnpj_or_cpf);
      if (documentExists) {
        throw new Error('Este CPF/CNPJ já está cadastrado no sistema');
      }

      // Criar usuário no Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      
      const userId = userCredential.user.uid;
      console.log('Usuário criado com ID:', userId);

      // Documento armazenado sem criptografia
      const documentValue = data.cnpj_or_cpf;

      // Preparar dados para o Firestore
      const partnerData = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: {
          street: data.street,
          number: data.number,
          complement: data.complement || '',
          neighborhood: data.neighborhood,
          neighborhoodName: data.neighborhoodName || '',
          city: data.city,
          cityName: data.cityName || '',
          state: data.state,
          stateName: data.stateName || '',
        },
        settings: {
          delivery: data.delivery ? JSON.parse(data.delivery) : null,
          pickup: data.pickup ? JSON.parse(data.pickup) : null,
          paymentOptions: data.paymentOptions ? JSON.parse(data.paymentOptions) : null,
          schedule: data.schedule ? JSON.parse(data.schedule) : null,
        },
        createdAt: new Date(),
        isActive: true,
        isOpen: false,
        lastUpdated: new Date().toISOString(),
        role: 'partner',
        status: 'pending',
        store: {
          name: data.storeName,
          category: data.category,
          subcategory: data.subcategory,
          document: documentValue,
          isPremium: false,
          premiumExpiresAt: null,
        },
        premiumFeatures: {
          advancedReports: false,
          analytics: false,
          prioritySupport: false,
        },
        updatedAt: new Date(),
      };

      console.log('Salvando dados do parceiro no Firestore:', partnerData);

      // Salvar no Firestore
      await setDoc(doc(db, 'partners', userId), partnerData);
      console.log('Dados do parceiro salvos com sucesso');

      try {
        // Log de sucesso apenas se analytics estiver disponível
        if (analytics) {
          logEvent(analytics, 'registration_complete', {
            userId: userId
          });
        }
      } catch (analyticsError) {
        console.log('Erro ao registrar analytics:', analyticsError);
      }

      return {
        success: true,
        userId,
        message: 'Cadastro realizado com sucesso!'
      };
    } catch (error: any) {
      console.error('Erro detalhado no cadastro:', error);
      
      // Melhor tratamento de erros
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Este e-mail já está em uso');
      }
      if (error.code === 'auth/invalid-email') {
        throw new Error('Email inválido');
      }
      if (error.code === 'auth/weak-password') {
        throw new Error('A senha deve ter pelo menos 6 caracteres');
      }
      if (error.code === 'auth/too-many-requests') {
        throw new Error('Muitas tentativas de cadastro. Por favor, tente novamente mais tarde.');
      }
      
      if (error.message === 'Este CPF/CNPJ já está cadastrado no sistema') {
        throw new Error('Este CPF/CNPJ já está cadastrado no sistema');
      }
      
      throw error;
    }
  }
}; 