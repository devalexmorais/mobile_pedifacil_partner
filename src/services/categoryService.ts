import { 
  collection, 
  getDocs,
  DocumentData,
  QueryDocumentSnapshot,
  query,
  where,
  collectionGroup
} from 'firebase/firestore';
import { db } from '../config/firebase';

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
  }
};
