import { 
  collection, 
  getDocs,
  DocumentData,
  QueryDocumentSnapshot,
  query,
  where,
  collectionGroup,
  addDoc,
  doc,
  setDoc,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { getAuth } from 'firebase/auth';

interface Subcategory {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  subcategories?: Subcategory[];
}

export const categoryService = {
  async getCategories(): Promise<Category[]> {
    try {
      console.log('Iniciando busca de categorias no Firebase...');
      
      const categoriesRef = collection(db, 'categories');
      const categoriesSnapshot = await getDocs(categoriesRef);
      
      // Buscar categorias e suas subcategorias
      const categoriesPromises = categoriesSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        
        // Buscar subcategorias da categoria atual usando subcoleção
        const subcategoriesRef = collection(db, 'categories', doc.id, 'subcategories');
        const subcategoriesSnapshot = await getDocs(subcategoriesRef);
        
        const subcategories = subcategoriesSnapshot.docs.map(subDoc => ({
          id: subDoc.id,
          name: subDoc.data().name
        }));

        return {
          id: doc.id,
          name: data.name,
          subcategories: subcategories
        };
      });

      const categories = await Promise.all(categoriesPromises);
      console.log('Categorias com subcategorias:', categories);
      return categories;
    } catch (error: any) {
      console.error('Erro ao buscar categorias:', error);
      throw new Error('Erro ao buscar categorias: ' + error.message);
    }
  },

  async getSubcategories(categoryId: string): Promise<Subcategory[]> {
    try {
      console.log('Buscando subcategorias para categoria:', categoryId);
      
      // Buscar subcategorias usando a subcoleção
      const subcategoriesRef = collection(db, 'categories', categoryId, 'subcategories');
      const subcategoriesSnapshot = await getDocs(subcategoriesRef);
      
      const subcategories = subcategoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }));

      console.log('Subcategorias encontradas:', subcategories);
      return subcategories;
    } catch (error) {
      console.error('Erro ao buscar subcategorias:', error);
      throw new Error('Não foi possível carregar as subcategorias');
    }
  },

  // Método adicional para buscar todas as subcategorias de uma vez (se necessário)
  async getAllSubcategories(): Promise<Subcategory[]> {
    try {
      const subcategoriesRef = collectionGroup(db, 'subcategories');
      const snapshot = await getDocs(subcategoriesRef);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }));
    } catch (error) {
      console.error('Erro ao buscar todas as subcategorias:', error);
      throw new Error('Não foi possível carregar as subcategorias');
    }
  },

  // Novo método para criar categoria personalizada para o parceiro
  async createPartnerCategory(name: string): Promise<Category> {
    try {
      console.log('Criando categoria personalizada:', name);
      
      const auth = getAuth();
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        throw new Error('Usuário não autenticado');
      }
      
      // Coleção de categorias específicas do parceiro
      const partnerCategoriesRef = collection(db, 'partners', userId, 'categories');
      
      const newCategory = {
        name,
        createdAt: serverTimestamp(),
        createdBy: userId
      };
      
      const docRef = await addDoc(partnerCategoriesRef, newCategory);
      
      console.log('Categoria criada com ID:', docRef.id);
      
      return {
        id: docRef.id,
        name
      };
    } catch (error: any) {
      console.error('Erro ao criar categoria personalizada:', error);
      throw new Error('Não foi possível criar a categoria: ' + error.message);
    }
  },
  
  // Método para buscar categorias personalizadas do parceiro
  async getPartnerCategories(): Promise<Category[]> {
    try {
      console.log('Buscando categorias personalizadas do parceiro...');
      
      const auth = getAuth();
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        throw new Error('Usuário não autenticado');
      }
      
      // Coleção de categorias específicas do parceiro
      const partnerCategoriesRef = collection(db, 'partners', userId, 'categories');
      const snapshot = await getDocs(partnerCategoriesRef);
      
      const categories = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }));
      
      console.log('Categorias personalizadas encontradas:', categories);
      return categories;
    } catch (error: any) {
      console.error('Erro ao buscar categorias personalizadas:', error);
      throw new Error('Não foi possível carregar suas categorias: ' + error.message);
    }
  },

  // Novo método para remover categoria personalizada do parceiro
  async deletePartnerCategory(categoryId: string): Promise<void> {
    try {
      const auth = getAuth();
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('Usuário não autenticado');
      }
      const categoryRef = doc(db, 'partners', userId, 'categories', categoryId);
      await deleteDoc(categoryRef);
    } catch (error: any) {
      console.error('Erro ao excluir categoria personalizada:', error);
      throw new Error('Não foi possível excluir a categoria: ' + error.message);
    }
  }
};
