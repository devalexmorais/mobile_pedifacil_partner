import { db } from '@/config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export interface State {
  id: string;
  name: string;
  abbreviation: string;
  isActive: boolean;
  _count?: {
    cities: number;
  };
}

export interface City {
  id: string;
  name: string;
  stateId: string;
  isActive: boolean;
}

export interface District {
  id: string;
  name: string;
  cityId: string;
  isActive: boolean;
}

export const locationService = {
  async getStates(): Promise<State[]> {
    try {
      const statesRef = collection(db, 'states');
      const q = query(statesRef, where('isActive', '==', true));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as State[];
    } catch (error) {
      console.error('Erro ao buscar estados:', error);
      throw new Error('Não foi possível carregar os estados');
    }
  },

  async getCities(stateId: string): Promise<City[]> {
    try {
      const citiesRef = collection(db, 'cities');
      const q = query(
        citiesRef,
        where('stateId', '==', stateId),
        where('isActive', '==', true)
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as City[];
    } catch (error) {
      console.error('Erro ao buscar cidades:', error);
      throw new Error('Não foi possível carregar as cidades');
    }
  },

  async getDistricts(cityId: string): Promise<District[]> {
    try {
      const districtsRef = collection(db, 'districts');
      const q = query(
        districtsRef,
        where('cityId', '==', cityId),
        where('isActive', '==', true)
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as District[];
    } catch (error) {
      console.error('Erro ao buscar bairros:', error);
      throw new Error('Não foi possível carregar os bairros');
    }
  }
};

export default locationService; 