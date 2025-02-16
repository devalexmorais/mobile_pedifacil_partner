import { db } from '@/config/firebase';

export interface Category {
  id: string;
  name: string;
  isActive: boolean;
}

export interface SubCategory {
  id: string;
  name: string;
  categoryId: string;
  isActive: boolean;
}

export const categoryService = {
  async getCategories(): Promise<Category[]> {
    try {
      const querySnapshot = await db.collection('categories')
        .where('isActive', '==', true)
        .get();
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Category[];
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      throw new Error('Não foi possível carregar as categorias');
    }
  },

  async getSubCategories(categoryId: string): Promise<SubCategory[]> {
    try {
      const querySnapshot = await db.collection('subcategories')
        .where('categoryId', '==', categoryId)
        .where('isActive', '==', true)
        .get();
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SubCategory[];
    } catch (error) {
      console.error('Erro ao buscar subcategorias:', error);
      throw new Error('Não foi possível carregar as subcategorias');
    }
  }
};

export default categoryService; 