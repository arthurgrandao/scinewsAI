import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/apiService';

export const useSubscribeTopic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (topicId: string) => {
      return await usersApi.subscribeTopic(topicId);
    },
    onSuccess: () => {
      // Invalidate auth context to refresh user data
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
};

export const useUnsubscribeTopic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (topicId: string) => {
      return await usersApi.unsubscribeTopic(topicId);
    },
    onSuccess: () => {
      // Invalidate auth context to refresh user data
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
};
