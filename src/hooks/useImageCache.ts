import { useState, useEffect } from 'react';

interface ImageCacheOptions {
  activeCategory?: string;
  categories: string[];
  preloadAdjacent?: boolean;
}

export function useImageCache({ activeCategory, categories, preloadAdjacent = true }: ImageCacheOptions) {
  const [loadedCategories, setLoadedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!activeCategory) return;

    // Sempre carrega a categoria ativa
    setLoadedCategories(prev => new Set([...prev, activeCategory]));

    // Se preloadAdjacent estiver habilitado, carrega as categorias adjacentes
    if (preloadAdjacent) {
      const currentIndex = categories.indexOf(activeCategory);
      
      if (currentIndex > 0) {
        const prevCategory = categories[currentIndex - 1];
        setLoadedCategories(prev => new Set([...prev, prevCategory]));
      }
      
      if (currentIndex < categories.length - 1) {
        const nextCategory = categories[currentIndex + 1];
        setLoadedCategories(prev => new Set([...prev, nextCategory]));
      }
    }
  }, [activeCategory, categories, preloadAdjacent]);

  const shouldLoadImagesForCategory = (categoryId: string) => {
    return loadedCategories.has(categoryId);
  };

  const clearCache = () => {
    setLoadedCategories(new Set());
  };

  return {
    shouldLoadImagesForCategory,
    clearCache,
    loadedCategories: Array.from(loadedCategories)
  };
} 