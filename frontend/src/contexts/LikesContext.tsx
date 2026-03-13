import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { likesApi } from '@/lib/apiService';
import { useAuth } from './AuthContext';

interface LikesContextType {
  likedArticles: Set<string>;
  loading: boolean;
  error: string | null;
  fetchUserLikes: (forceRefresh?: boolean) => Promise<void>;
  toggleLike: (articleId: string, liked: boolean) => void;
  invalidateCache: () => void;
  isCacheValid: boolean;
}

const LikesContext = createContext<LikesContextType | undefined>(undefined);

export function LikesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [likedArticles, setLikedArticles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCacheValid, setIsCacheValid] = useState(false);

  const fetchUserLikes = useCallback(async (forceRefresh = false) => {
    // Não buscar se não autenticado
    if (!isAuthenticated) {
      setLikedArticles(new Set());
      setIsCacheValid(false);
      return;
    }

    // Se cache é válido e não é forçado refresh, não buscamos
    if (!forceRefresh && isCacheValid) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await likesApi.getUserLikes();
      const likedIds = data.liked_articles || [];
      setLikedArticles(new Set(likedIds));
      setIsCacheValid(true);
    } catch (err: any) {
      console.error('Error loading user likes:', err);
      setError('Erro ao carregar likes.');
      // Não limpar o cache em caso de erro
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isCacheValid]);

  // Fetch likes when component mounts ou user becomes authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchUserLikes();
    }
  }, [isAuthenticated, fetchUserLikes]);

  const toggleLike = useCallback((articleId: string, liked: boolean) => {
    setLikedArticles((prev) => {
      const newSet = new Set(prev);
      if (liked && !newSet.has(articleId)) {
        newSet.add(articleId);
      } else if (!liked && newSet.has(articleId)) {
        newSet.delete(articleId);
      }
      return newSet;
    });
  }, []);

  // Invalidar cache - deve ser chamado após like/unlike bem-sucedido
  const invalidateCache = useCallback(() => {
    setIsCacheValid(false);
  }, []);

  return (
    <LikesContext.Provider
      value={{
        likedArticles,
        loading,
        error,
        fetchUserLikes,
        toggleLike,
        invalidateCache,
        isCacheValid,
      }}
    >
      {children}
    </LikesContext.Provider>
  );
}

export function useLikes() {
  const context = useContext(LikesContext);
  if (!context) {
    throw new Error('useLikes deve ser usado dentro de LikesProvider');
  }
  return context;
}
