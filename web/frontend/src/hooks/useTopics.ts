import { useQuery } from '@tanstack/react-query';
import { topicsApi } from '@/lib/apiService';

export const useTopics = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['topics'],
    queryFn: async () => {
      return await topicsApi.getAll();
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    enabled,
  });
};

export const useTopicById = (id: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['topics', id],
    queryFn: async () => {
      return await topicsApi.getById(id);
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    enabled,
  });
};

export const useTopicArticles = (
  topicId: string,
  params?: { skip?: number; limit?: number },
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['topics', topicId, 'articles', params],
    queryFn: async () => {
      return await topicsApi.getArticles(topicId, params);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    enabled,
  });
};
