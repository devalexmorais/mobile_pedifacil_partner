import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { getAnalytics, logEvent } from 'firebase/analytics';
import * as Crypto from 'expo-crypto';

// Inicializar o analytics
const analytics = getAnalytics();

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
  city: string;
  state: string;
  
  // Dados do estabelecimento
  storeName: string;
  category: string;
  subcategory: string;
  cnpj_or_cpf: string;
}

const encryptDocument = async (document: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(document);
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    document
  );
  return hash;
};

const checkDocumentExists = async (document: string): Promise<boolean> => {
  const encryptedDocument = await encryptDocument(document);
  const partnersRef = collection(db, 'partners');
  const q = query(
    partnersRef, 
    where('store.document', '==', encryptedDocument)
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

      // Criptografar o documento antes de salvar
      const encryptedDocument = await encryptDocument(data.cnpj_or_cpf);

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
          city: data.city,
          state: data.state,
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
          document: encryptedDocument,
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
        // Log de sucesso - em um try/catch separado pois analytics pode falhar em alguns ambientes
        logEvent(analytics, 'registration_complete', {
          userId: userId
        });
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
      
      if (error.message === 'Este CPF/CNPJ já está cadastrado no sistema') {
        throw new Error('Este CPF/CNPJ já está cadastrado no sistema');
      }
      
      throw error;
    }
  }
}; 