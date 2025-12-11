import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Article } from '@/types';
import { articlesApi } from '@/lib/apiService';

interface ArticlesContextType {
  articles: Article[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;
  fetchArticles: (forceRefresh?: boolean) => Promise<void>;
  isStale: boolean;
}

const ArticlesContext = createContext<ArticlesContextType | undefined>(undefined);

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos em milissegundos

export function ArticlesProvider({ children }: { children: ReactNode }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number | null>(null);

  const isStale = lastFetch ? Date.now() - lastFetch > CACHE_DURATION : true;

  const fetchArticles = useCallback(async (forceRefresh = false) => {
    // Se temos dados em cache e não é forçado refresh, não buscamos
    if (!forceRefresh && articles.length > 0 && !isStale) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const articlesData = await articlesApi.getAll({ page: 1, page_size: 50 });
      const articlesList = articlesData.articles || articlesData.items || articlesData || [];
      setArticles(Array.isArray(articlesList) ? articlesList : []);
      setLastFetch(Date.now());
    } catch (err: any) {
      console.error('Error loading articles:', err);
      setError('Erro ao carregar artigos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [articles.length, isStale]);

  return (
    <ArticlesContext.Provider value={{ articles, loading, error, lastFetch, fetchArticles, isStale }}>
      {children}
    </ArticlesContext.Provider>
  );
}

export function useArticles() {
  const context = useContext(ArticlesContext);
  if (!context) {
    throw new Error('useArticles deve ser usado dentro de ArticlesProvider');
  }
  return context;
}
