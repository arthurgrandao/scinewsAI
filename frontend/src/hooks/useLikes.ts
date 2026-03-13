import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { likesApi } from '@/lib/apiService';

export const useUserLikes = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['likes', 'user'],
    queryFn: async () => {
      const response = await likesApi.getUserLikes();
      return response;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    enabled,
  });
};

export const useLikeArticle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (articleId: string) => {
      return await likesApi.like(articleId);
    },
    onSuccess: () => {
      // Invalidate the user likes query to trigger a refresh
      queryClient.invalidateQueries({ queryKey: ['likes', 'user'] });
    },
  });
};

export const useUnlikeArticle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (articleId: string) => {
      return await likesApi.unlike(articleId);
    },
    onSuccess: () => {
      // Invalidate the user likes query to trigger a refresh
      queryClient.invalidateQueries({ queryKey: ['likes', 'user'] });
    },
  });
};
