import { 
  collection, 
  getDocs,
  DocumentData,
  QueryDocumentSnapshot,
  collectionGroup
} from 'firebase/firestore';
import { db } from '../config/firebase';

interface Neighborhood {
  id: string;
  name: string;
}

interface City {
  id: string;
  name: string;
  neighborhoods?: Neighborhood[];
}

interface State {
  id: string;
  name: string;
  cities?: City[];
}

export const addressService = {
  async getStates(): Promise<State[]> {
    try {
      console.log('Iniciando busca de estados...');
      
      const statesRef = collection(db, 'states');
      const statesSnapshot = await getDocs(statesRef);
      
      // Buscar estados e suas cidades
      const statesPromises = statesSnapshot.docs.map(async (stateDoc) => {
        const stateData = stateDoc.data();
        
        // Buscar cidades do estado atual
        const citiesRef = collection(db, 'states', stateDoc.id, 'cities');
        const citiesSnapshot = await getDocs(citiesRef);
        
        const citiesPromises = citiesSnapshot.docs.map(async (cityDoc) => {
          // Buscar bairros da cidade atual
          const neighborhoodsRef = collection(
            db, 
            'states', 
            stateDoc.id, 
            'cities', 
            cityDoc.id, 
            'neighborhoods'
          );
          const neighborhoodsSnapshot = await getDocs(neighborhoodsRef);
          
          const neighborhoods = neighborhoodsSnapshot.docs.map(neighborhoodDoc => ({
            id: neighborhoodDoc.id,
            name: neighborhoodDoc.data().name
          }));

          return {
            id: cityDoc.id,
            name: cityDoc.data().name,
            neighborhoods: neighborhoods
          };
        });

        const cities = await Promise.all(citiesPromises);

        return {
          id: stateDoc.id,
          name: stateData.name,
          cities: cities
        };
      });

      const states = await Promise.all(statesPromises);
      console.log('Estados com cidades e bairros:', states);
      return states;
    } catch (error: any) {
      console.error('Erro ao buscar estados:', error);
      throw new Error('Erro ao buscar estados: ' + error.message);
    }
  },

  async getCities(stateId: string): Promise<City[]> {
    try {
      console.log('Buscando cidades para estado:', stateId);
      
      const citiesRef = collection(db, 'states', stateId, 'cities');
      const citiesSnapshot = await getDocs(citiesRef);
      
      const citiesPromises = citiesSnapshot.docs.map(async (cityDoc) => {
        const neighborhoodsRef = collection(
          db, 
          'states', 
          stateId, 
          'cities', 
          cityDoc.id, 
          'neighborhoods'
        );
        const neighborhoodsSnapshot = await getDocs(neighborhoodsRef);
        
        const neighborhoods = neighborhoodsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name
        }));

        return {
          id: cityDoc.id,
          name: cityDoc.data().name,
          neighborhoods: neighborhoods
        };
      });

      const cities = await Promise.all(citiesPromises);
      console.log('Cidades encontradas:', cities);
      return cities;
    } catch (error) {
      console.error('Erro ao buscar cidades:', error);
      throw new Error('Não foi possível carregar as cidades');
    }
  },

  async getNeighborhoods(stateId: string, cityId: string): Promise<Neighborhood[]> {
    try {
      console.log('Buscando bairros para cidade:', cityId);
      
      const neighborhoodsRef = collection(
        db, 
        'states', 
        stateId, 
        'cities', 
        cityId, 
        'neighborhoods'
      );
      const neighborhoodsSnapshot = await getDocs(neighborhoodsRef);
      
      const neighborhoods = neighborhoodsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }));

      console.log('Bairros encontrados:', neighborhoods);
      return neighborhoods;
    } catch (error) {
      console.error('Erro ao buscar bairros:', error);
      throw new Error('Não foi possível carregar os bairros');
    }
  },

  // Método adicional para buscar todos os bairros de uma vez (se necessário)
  async getAllNeighborhoods(): Promise<Neighborhood[]> {
    try {
      const neighborhoodsRef = collectionGroup(db, 'neighborhoods');
      const snapshot = await getDocs(neighborhoodsRef);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }));
    } catch (error) {
      console.error('Erro ao buscar todos os bairros:', error);
      throw new Error('Não foi possível carregar os bairros');
    }
  }
}; 