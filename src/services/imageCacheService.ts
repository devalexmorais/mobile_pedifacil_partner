import { Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ImageCacheEntry {
  uri: string;
  timestamp: number;
  categoryId: string;
}

class ImageCacheService {
  private readonly CACHE_KEY = 'image_cache_entries';
  private readonly CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 dias em ms
  private readonly MAX_CACHE_SIZE = 100; // máximo de 100 imagens
  
  private cacheEntries: Map<string, ImageCacheEntry> = new Map();
  private preloadedImages: Set<string> = new Set();

  async initialize() {
    try {
      const cached = await AsyncStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const entries: ImageCacheEntry[] = JSON.parse(cached);
        entries.forEach(entry => {
          this.cacheEntries.set(entry.uri, entry);
        });
      }
    } catch (error) {
      console.error('Erro ao inicializar cache de imagens:', error);
    }
  }

  async preloadImagesForCategory(categoryId: string, imageUris: string[]) {
    try {
      const validUris = imageUris.filter(uri => 
        uri && 
        uri.startsWith('http') && 
        !this.preloadedImages.has(uri)
      );
      
      if (validUris.length === 0) return;

      // Limita o número de imagens a serem carregadas simultaneamente
      const batchSize = 2;
      const batches = this.chunkArray(validUris, batchSize);

      for (const batch of batches) {
        const preloadPromises = batch.map(uri => this.preloadSingleImage(uri, categoryId));
        
        // Aguarda o batch atual ou timeout de 5 segundos
        await Promise.race([
          Promise.allSettled(preloadPromises),
          new Promise(resolve => setTimeout(resolve, 5000))
        ]);
        
        // Pequeno delay entre batches
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error('Erro ao fazer preload das imagens:', error);
    }
  }

  private async preloadSingleImage(uri: string, categoryId: string): Promise<void> {
    return new Promise((resolve) => {
      try {
        // Verifica se já foi feito preload
        if (this.preloadedImages.has(uri)) {
          resolve();
          return;
        }

        // Usa Image.prefetch para fazer preload no React Native
        Image.prefetch(uri)
          .then(() => {
            this.preloadedImages.add(uri);
            
            // Adiciona ao cache
            this.cacheEntries.set(uri, {
              uri,
              timestamp: Date.now(),
              categoryId
            });
            
            // Salva no AsyncStorage (async sem await para não bloquear)
            this.saveCacheEntries();
            resolve();
          })
          .catch((error) => {
            console.warn(`Erro ao fazer preload da imagem ${uri}:`, error);
            resolve(); // Resolve mesmo com erro para não bloquear
          });

        // Timeout de 3 segundos por imagem
        setTimeout(() => {
          resolve();
        }, 3000);

      } catch (error) {
        console.warn(`Erro geral no preload da imagem ${uri}:`, error);
        resolve();
      }
    });
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private isExpired(entry: ImageCacheEntry): boolean {
    return Date.now() - entry.timestamp > this.CACHE_EXPIRY;
  }

  async clearExpiredCache() {
    try {
      const now = Date.now();
      const validEntries = Array.from(this.cacheEntries.values())
        .filter(entry => now - entry.timestamp <= this.CACHE_EXPIRY);

      this.cacheEntries.clear();
      validEntries.forEach(entry => {
        this.cacheEntries.set(entry.uri, entry);
      });

      await this.saveCacheEntries();
    } catch (error) {
      console.error('Erro ao limpar cache expirado:', error);
    }
  }

  async clearCacheForCategory(categoryId: string) {
    try {
      const entries = Array.from(this.cacheEntries.entries());
      entries.forEach(([uri, entry]) => {
        if (entry.categoryId === categoryId) {
          this.cacheEntries.delete(uri);
          this.preloadedImages.delete(uri);
        }
      });

      await this.saveCacheEntries();
    } catch (error) {
      console.error('Erro ao limpar cache da categoria:', error);
    }
  }

  async clearAllCache() {
    try {
      this.cacheEntries.clear();
      this.preloadedImages.clear();
      await AsyncStorage.removeItem(this.CACHE_KEY);
    } catch (error) {
      console.error('Erro ao limpar todo o cache:', error);
    }
  }

  private async saveCacheEntries() {
    try {
      // Mantém apenas as entradas mais recentes se exceder o limite
      const entries = Array.from(this.cacheEntries.values())
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, this.MAX_CACHE_SIZE);

      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.error('Erro ao salvar entradas do cache:', error);
    }
  }

  getCacheStats() {
    const totalEntries = this.cacheEntries.size;
    const preloadedCount = this.preloadedImages.size;
    const expiredEntries = Array.from(this.cacheEntries.values())
      .filter(entry => this.isExpired(entry)).length;
    
    return {
      totalEntries,
      preloadedCount,
      expiredEntries,
      validEntries: totalEntries - expiredEntries
    };
  }

  isImagePreloaded(uri: string): boolean {
    return this.preloadedImages.has(uri);
  }
}

export const imageCacheService = new ImageCacheService(); 