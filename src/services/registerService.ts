import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { getAnalytics, logEvent } from 'firebase/analytics';
import { analytics } from '../config/firebase';

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

interface RegisterPartnerData extends RegisterData {
  isPremium?: boolean;
  premiumExpiresAt?: string;
}

export const registerService = {
  async registerPartner(data: RegisterPartnerData) {
    try {
      if (analytics) {
        logEvent(analytics, 'begin_registration', {
          email: data.email
        });
      }

      console.log('Iniciando processo de cadastro com dados:', data);
      
      // Validar dados obrigatórios
      if (!data.email || !data.password) {
        throw new Error('Email e senha são obrigatórios');
      }

      // 1. Criar usuário no Authentication
      console.log('Criando usuário no Authentication...');
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      
      const userId = userCredential.user.uid;
      console.log('Usuário criado com ID:', userId);

      // 2. Criar documento do parceiro no Firestore
      const partnerData = {
        // Dados pessoais
        name: data.name,
        email: data.email,
        phone: data.phone,
        
        // Endereço
        address: {
          street: data.street,
          number: data.number,
          complement: data.complement || '',
          neighborhood: data.neighborhood,
          city: data.city,
          state: data.state,
        },
        
        // Dados do estabelecimento
        store: {
          name: data.storeName,
          category: data.category,
          subcategory: data.subcategory,
          document: data.cnpj_or_cpf,
          isPremium: false,
          premiumExpiresAt: null,
          premiumFeatures: {
            analytics: false,
            advancedReports: false,
            prioritySupport: false,
          }
        },
        
        // Metadados
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'pending',
        isActive: true,
        role: 'partner',
        isOpen: false,
        lastUpdated: new Date().toISOString(),
      };

      console.log('Salvando dados do parceiro no Firestore:', partnerData);

      // Salvar no Firestore
      await setDoc(doc(db, 'partners', userId), partnerData);
      console.log('Dados do parceiro salvos com sucesso');

      // Log de sucesso
      if (analytics) {
        logEvent(analytics, 'registration_complete', {
          userId: userId
        });
      }

      return {
        success: true,
        userId,
        message: 'Cadastro realizado com sucesso!'
      };
    } catch (error: any) {
      // Log de erro
      if (analytics) {
        logEvent(analytics, 'registration_error', {
          error_code: error.code,
          error_message: error.message
        });
      }

      console.error('Erro detalhado no cadastro:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Este e-mail já está em uso');
      }
      
      if (error.code === 'auth/invalid-email') {
        throw new Error('Email inválido');
      }

      if (error.code === 'auth/weak-password') {
        throw new Error('A senha deve ter pelo menos 6 caracteres');
      }
      
      throw new Error(error.message || 'Erro ao realizar cadastro');
    }
  }
}; 