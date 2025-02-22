import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { addDoc, serverTimestamp } from 'firebase/firestore';

export const partnerService = {
  async checkEmailExists(email: string): Promise<boolean> {
    try {
      // Verifica na coleção partners
      const partnersRef = collection(db, 'partners');
      const partnersQuery = query(partnersRef, where('email', '==', email));
      const partnersSnapshot = await getDocs(partnersQuery);
      
      if (!partnersSnapshot.empty) {
        return true;
      }

      // Verifica na coleção users
      const usersRef = collection(db, 'users');
      const usersQuery = query(usersRef, where('email', '==', email));
      const usersSnapshot = await getDocs(usersQuery);
      
      return !usersSnapshot.empty;
    } catch (error) {
      console.error('Erro ao verificar email:', error);
      throw new Error('Não foi possível verificar o email');
    }
  },

  async registerPartner(data: RegisterPartnerData) {
    try {
      // Verifica novamente antes de registrar
      const emailExists = await this.checkEmailExists(data.email);
      if (emailExists) {
        throw new Error('Este e-mail já está em uso');
      }

      // Continua com o registro se o email não existir
      const partnersRef = collection(db, 'partners');
      const docRef = await addDoc(partnersRef, {
        ...data,
        createdAt: serverTimestamp(),
        status: 'pending'
      });

      return docRef.id;
    } catch (error) {
      console.error('Erro ao registrar parceiro:', error);
      throw error;
    }
  }
};

export interface RegisterPartnerData {
  name: string;
  email: string;
  password: string;
  phone: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  storeName: string;
  category: string;
  subcategory: string;
  cnpj_or_cpf: string;
} 