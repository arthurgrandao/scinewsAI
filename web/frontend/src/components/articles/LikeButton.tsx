import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { likesApi } from '@/lib/apiService';
import { useLikes } from '@/contexts/LikesContext';
import { toast } from '@/hooks/use-toast';

interface LikeButtonProps {
  articleId: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  onLikeChange?: (articleId: string, isLiked: boolean) => void;
}

export function LikeButton({ articleId, size = 'md', variant = 'outline', onLikeChange }: LikeButtonProps) {
  const { likedArticles, toggleLike, invalidateCache } = useLikes();
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const isLiked = likedArticles.has(articleId);

  // Load initial like count
  useEffect(() => {
    loadLikeCount();
  }, [articleId]);

  const loadLikeCount = async () => {
    try {
      setInitialLoading(true);
      const data = await likesApi.getCount(articleId);
      setLikeCount(data.like_count);
    } catch (error) {
      console.error('Error loading like count:', error);
      setLikeCount(0);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleToggleLike = async () => {
    if (initialLoading) return;

    try {
      setLoading(true);
      if (isLiked) {
        await likesApi.unlike(articleId);
        toggleLike(articleId, false);
        setLikeCount((prev) => Math.max(0, prev - 1));
        onLikeChange?.(articleId, false);
        invalidateCache();
        toast({
          title: 'Sucesso',
          description: 'Você removeu a curtida',
        });
      } else {
        await likesApi.like(articleId);
        toggleLike(articleId, true);
        setLikeCount((prev) => prev + 1);
        onLikeChange?.(articleId, true);
        invalidateCache();
        toast({
          title: 'Sucesso',
          description: 'Você curtiu este artigo!',
        });
      }
    } catch (error: any) {
      console.error('Error toggling like:', error);
      
      if (error.response?.status === 401) {
        toast({
          title: 'Autenticação necessária',
          description: 'Você precisa estar logado para curtir artigos',
          variant: 'destructive',
        });
      } else if (error.response?.status === 400) {
        // Already liked
        if (!isLiked) {
          toggleLike(articleId, true);
          setLikeCount((prev) => prev + 1);
          onLikeChange?.(articleId, true);
          invalidateCache();
        }
      } else {
        toast({
          title: 'Erro',
          description: 'Falha ao processar curtida',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'h-8 px-2 text-sm gap-1',
    md: 'h-10 px-3 gap-2',
    lg: 'h-12 px-4 gap-2',
  };

  const iconSize = {
    sm: 16,
    md: 18,
    lg: 20,
  };

  return (
    <Button
      onClick={handleToggleLike}
      disabled={loading || initialLoading}
      variant={variant}
      className={`${sizeClasses[size]} ${
        isLiked
          ? 'text-red-500 border-red-500 hover:bg-red-50 dark:hover:bg-red-950'
          : ''
      }`}
    >
      <Heart
        size={iconSize[size]}
        fill={isLiked ? 'currentColor' : 'none'}
      />
      <span className="font-medium">{likeCount}</span>
    </Button>
  );
}
