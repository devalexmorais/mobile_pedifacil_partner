import { 
  collection, 
  getDocs, 
  query, 
  where,
  DocumentData,
  QueryDocumentSnapshot 
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface State {
  id: string;
  name: string;
  uf: string;
}

export interface City {
  id: string;
  name: string;
  stateId: string;
}

export interface District {
  id: string;
  name: string;
  cityId: string;
}

export const locationService = {
  async getStates(): Promise<State[]> {
    try {
      const statesRef = collection(db, 'states');
      const snapshot = await getDocs(statesRef);
      return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
        id: doc.id,
        name: doc.data().name,
        uf: doc.data().uf
      }));
    } catch (error) {
      console.error('Error fetching states:', error);
      throw error;
    }
  },

  async getCitiesByState(stateId: string): Promise<City[]> {
    try {
      const citiesRef = collection(db, 'cities');
      const q = query(citiesRef, where('stateId', '==', stateId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
        id: doc.id,
        name: doc.data().name,
        stateId: doc.data().stateId
      }));
    } catch (error) {
      console.error('Error fetching cities:', error);
      throw error;
    }
  },

  async getDistrictsByCity(cityId: string): Promise<District[]> {
    try {
      const districtsRef = collection(db, 'districts');
      const q = query(districtsRef, where('cityId', '==', cityId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
        id: doc.id,
        name: doc.data().name,
        cityId: doc.data().cityId
      }));
    } catch (error) {
      console.error('Error fetching districts:', error);
      throw error;
    }
  }
};
