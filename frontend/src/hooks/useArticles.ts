import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { articlesApi } from '@/lib/apiService';
import { Article } from '@/types';

const PAGE_SIZE = 20;

export const useArticlesList = (
  filters?: {
    page?: number;
    search?: string;
    topic?: string;
  }
) => {
  return useQuery({
    queryKey: ['articles', { ...filters }],
    queryFn: async () => {
      const data = await articlesApi.getAll({
        page_size: PAGE_SIZE,
        ...filters,
      });
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
  });
};

export const useSubscribedFeed = (
  filters?: {
    search?: string;
  },
  enabled: boolean = true
) => {
  return useInfiniteQuery({
    queryKey: ['articles', 'subscribed', { ...filters }],
    queryFn: async ({ pageParam = 1 }) => {
      const data = await articlesApi.getSubscribedFeed({
        page: pageParam,
        page_size: PAGE_SIZE,
        ...filters,
      });
      return {
        articles: Array.isArray(data.articles) ? data.articles : data.items || [],
        total: data.total || 0,
        page: pageParam,
      };
    },
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((acc, page) => acc + page.articles.length, 0);
      return totalFetched < lastPage.total ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    enabled,
  });
};

export const useArticleById = (id: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['articles', id],
    queryFn: async () => {
      return await articlesApi.getById(id);
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    enabled,
  });
};

export const useSearchArticles = (
  searchQuery: string,
  enabled: boolean = true
) => {
  return useInfiniteQuery({
    queryKey: ['articles', 'search', searchQuery],
    queryFn: async ({ pageParam = 1 }) => {
      const data = await articlesApi.getSubscribedFeed({
        page: pageParam,
        page_size: PAGE_SIZE,
        search: searchQuery,
      });
      return {
        articles: Array.isArray(data.articles) ? data.articles : data.items || [],
        total: data.total || 0,
        page: pageParam,
      };
    },
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((acc, page) => acc + page.articles.length, 0);
      return totalFetched < lastPage.total ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 1000 * 60 * 3, // 3 minutes for search results
    gcTime: 1000 * 60 * 15, // 15 minutes
    enabled: enabled && searchQuery.length > 0,
  });
};
