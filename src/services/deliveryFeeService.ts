import { db } from '@/config/firebase';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';

export interface DeliveryFee {
  id: string;
  neighborhood: string;
  fee: number;
  storeId: string;
  createdAt: string;
  updatedAt: string;
}

export const deliveryFeeService = {
  async getDeliveryFeeForNeighborhood(storeId: string, neighborhood: string): Promise<DeliveryFee | null> {
    try {
      const q = query(
        collection(db, 'partners', storeId, 'delivery_fees'),
        where('neighborhood', '==', neighborhood)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as DeliveryFee;
    } catch (error) {
      console.error('Erro ao buscar taxa de entrega:', error);
      throw new Error('Não foi possível buscar a taxa de entrega');
    }
  },

  async getAllDeliveryFees(storeId: string): Promise<DeliveryFee[]> {
    try {
      const deliveryFeesRef = collection(db, 'partners', storeId, 'delivery_fees');
      const snapshot = await getDocs(deliveryFeesRef);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DeliveryFee[];
    } catch (error) {
      console.error('Erro ao buscar taxas de entrega:', error);
      throw new Error('Não foi possível buscar as taxas de entrega');
    }
  },

  async createDeliveryFee(data: Omit<DeliveryFee, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const { storeId, ...deliveryFeeData } = data;
      const deliveryFeesRef = collection(db, 'partners', storeId, 'delivery_fees');
      
      const docRef = await addDoc(deliveryFeesRef, {
        ...deliveryFeeData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar taxa de entrega:', error);
      throw new Error('Não foi possível criar a taxa de entrega');
    }
  },

  async updateDeliveryFee(storeId: string, feeId: string, data: Partial<DeliveryFee>): Promise<void> {
    try {
      const deliveryFeeRef = doc(db, 'partners', storeId, 'delivery_fees', feeId);
      await updateDoc(deliveryFeeRef, {
        ...data,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao atualizar taxa de entrega:', error);
      throw new Error('Não foi possível atualizar a taxa de entrega');
    }
  },

  async deleteDeliveryFee(storeId: string, feeId: string): Promise<void> {
    try {
      const deliveryFeeRef = doc(db, 'partners', storeId, 'delivery_fees', feeId);
      await deleteDoc(deliveryFeeRef);
    } catch (error) {
      console.error('Erro ao excluir taxa de entrega:', error);
      throw new Error('Não foi possível excluir a taxa de entrega');
    }
  }
}; 