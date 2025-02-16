import axios from 'axios';

// Substitua pelo IP da sua máquina na rede local
const API_URL = 'http://192.168.18.139:8080/api';

// Configuração global do Axios
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000, // 10 segundos
  headers: {
    'Content-Type': 'application/json',
  }
});

interface Category {
  id: string;
  name: string;
  isActive: boolean;
}

interface SubCategory {
  id: string;
  name: string;
  categoryId: string;
  isActive: boolean;
}

export const categoryService = {
  async getCategories(): Promise<Category[]> {
    try {
      console.log('Buscando categorias...');
      const response = await api.get('/categories');
      console.log('Resposta da API de categorias:', response.data);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      if (axios.isAxiosError(error)) {
        console.error('Status:', error.response?.status);
        console.error('Dados:', error.response?.data);
        if (error.code === 'ECONNABORTED') {
          throw new Error('Tempo limite de conexão excedido. Verifique sua conexão com a internet.');
        }
        if (!error.response) {
          throw new Error('Não foi possível conectar ao servidor. Verifique se a API está rodando.');
        }
      }
      throw error;
    }
  },

  async getSubCategories(categoryId: string): Promise<SubCategory[]> {
    try {
      console.log('Buscando subcategorias para a categoria:', categoryId);
      const response = await api.get('/admin/subcategories', {
        params: { categoryId }
      });
      console.log('Resposta da API de subcategorias:', response.data);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar subcategorias:', error);
      if (axios.isAxiosError(error)) {
        console.error('Status:', error.response?.status);
        console.error('Dados:', error.response?.data);
        if (error.code === 'ECONNABORTED') {
          throw new Error('Tempo limite de conexão excedido. Verifique sua conexão com a internet.');
        }
        if (!error.response) {
          throw new Error('Não foi possível conectar ao servidor. Verifique se a API está rodando.');
        }
      }
      throw error;
    }
  }
};

// Função temporária para dados mockados
export const getMockedCategories = async (): Promise<Category[]> => {
  // Implementação temporária com dados mockados
  return [
    { id: '1', name: 'Categoria 1', isActive: true },
    { id: '2', name: 'Categoria 2', isActive: true },
    // adicione mais categorias conforme necessário
  ];
}; 