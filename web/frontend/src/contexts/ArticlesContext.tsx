import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Article } from '@/types';
import { articlesApi } from '@/lib/apiService';

interface ArticlesContextType {
  articles: Article[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  currentPage: number;
  fetchArticles: (forceRefresh?: boolean) => Promise<void>;
  fetchNextPage: () => Promise<void>;
  searchArticles: (query: string) => Promise<void>;
  resetPagination: () => void;
}

const ArticlesContext = createContext<ArticlesContextType | undefined>(undefined);

const PAGE_SIZE = 20;

export function ArticlesProvider({ children }: { children: ReactNode }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalArticles, setTotalArticles] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const hasMore = articles.length < totalArticles;

  const fetchArticlesPage = useCallback(async (page: number, search: string = '', replace: boolean = true) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page,
        page_size: PAGE_SIZE,
        ...(search && { search }),
      };

      // Use subscribed/feed endpoint which returns all translated articles
      const data = await articlesApi.getSubscribedFeed(params);

      const articlesList = data.articles || data.items || [];
      setTotalArticles(data.total || 0);

      if (replace) {
        setArticles(articlesList);
        setCurrentPage(1);
      } else {
        setArticles((prev) => [...prev, ...articlesList]);
        setCurrentPage(page);
      }
    } catch (err: any) {
      console.error('Error loading articles:', err);
      setError('Erro ao carregar artigos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchArticles = useCallback(async (forceRefresh: boolean = false) => {
    if (forceRefresh || articles.length === 0) {
      await fetchArticlesPage(1, searchQuery, true);
    }
  }, [articles.length, fetchArticlesPage, searchQuery]);

  const fetchNextPage = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchArticlesPage(currentPage + 1, searchQuery, false);
  }, [currentPage, hasMore, loading, fetchArticlesPage, searchQuery]);

  const searchArticles = useCallback(async (query: string) => {
    setSearchQuery(query);
    await fetchArticlesPage(1, query, true);
  }, [fetchArticlesPage]);

  const resetPagination = useCallback(() => {
    setCurrentPage(1);
    setArticles([]);
    setSearchQuery('');
    setTotalArticles(0);
  }, []);

  return (
    <ArticlesContext.Provider
      value={{
        articles,
        loading,
        error,
        hasMore,
        currentPage,
        fetchArticles,
        fetchNextPage,
        searchArticles,
        resetPagination,
      }}
    >
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
