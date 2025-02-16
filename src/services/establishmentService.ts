import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export const establishmentService = {
  async toggleEstablishmentStatus(isOpen: boolean) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');

      const partnerRef = doc(db, 'partners', user.uid);
      const partnerDoc = await getDoc(partnerRef);

      if (!partnerDoc.exists()) {
        // Se o documento não existir, cria com o status inicial
        await setDoc(partnerRef, {
          isOpen,
          lastUpdated: new Date().toISOString()
        }, { merge: true }); // merge: true preserva outros campos existentes
      } else {
        // Se existir, apenas atualiza os campos necessários
        await updateDoc(partnerRef, {
          isOpen,
          lastUpdated: new Date().toISOString()
        });
      }

      console.log(`Estabelecimento ${isOpen ? 'aberto' : 'fechado'} com sucesso`);
      return true;
    } catch (error) {
      console.error('Erro ao alterar status do estabelecimento:', error);
      throw error;
    }
  },

  async getEstablishmentStatus() {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');

      const partnerRef = doc(db, 'partners', user.uid);
      const partnerDoc = await getDoc(partnerRef);

      if (partnerDoc.exists()) {
        const data = partnerDoc.data();
        // Se o campo isOpen não existir, retorna false como padrão
        return data.isOpen ?? false;
      }

      return false;
    } catch (error) {
      console.error('Erro ao obter status do estabelecimento:', error);
      throw error;
    }
  },

  // Método para inicializar o status do estabelecimento se necessário
  async initializeEstablishmentStatus() {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');

      const partnerRef = doc(db, 'partners', user.uid);
      const partnerDoc = await getDoc(partnerRef);

      if (partnerDoc.exists() && !partnerDoc.data().hasOwnProperty('isOpen')) {
        // Se o documento existe mas não tem o campo isOpen, adiciona ele
        await updateDoc(partnerRef, {
          isOpen: false,
          lastUpdated: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Erro ao inicializar status do estabelecimento:', error);
      throw error;
    }
  }
}; 