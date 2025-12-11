import { Link } from 'react-router-dom';
import { Article } from '@/types';
import { Calendar, Users, ArrowRight, Heart } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { likesApi } from '@/lib/apiService';

interface ArticleCardProps {
  article: Article;
  isLiked?: boolean;
  onLikeChange?: (articleId: string, isLiked: boolean) => void;
}

export function ArticleCard({ article, isLiked = false, onLikeChange }: ArticleCardProps) {
  const [isCurrentlyLiked, setIsCurrentlyLiked] = useState(isLiked);
  const [isLoading, setIsLoading] = useState(false);

  const handleLikeClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLoading) return;

    try {
      setIsLoading(true);
      const newLikeState = !isCurrentlyLiked;

      // Call API to like/unlike
      if (newLikeState) {
        await likesApi.like(article.id);
      } else {
        await likesApi.unlike(article.id);
      }

      // Update local state
      setIsCurrentlyLiked(newLikeState);
      onLikeChange?.(article.id, newLikeState);

      toast({
        title: newLikeState ? 'Curtido!' : 'Descurtido',
        description: newLikeState
          ? 'Você curtiu este artigo!'
          : 'Você removeu a curtida',
      });
    } catch (error: any) {
      console.error('Error toggling like:', error);

      if (error.response?.status === 401) {
        toast({
          title: 'Autenticação necessária',
          description: 'Você precisa estar logado para curtir artigos',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro',
          description: 'Falha ao processar curtida',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Link to={`/article/${article.id}`} className="block">
      <article className="scholarly-card p-6 h-full flex flex-col">
        {/* Header with metadata and like button */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-1">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(new Date(article.publication_date), 'dd/MM/yyyy')}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {article.authors.length} autor{article.authors.length !== 1 ? 'es' : ''}
            </span>
          </div>
          
          {/* Like button */}
          <button
            onClick={handleLikeClick}
            disabled={isLoading}
            className="flex-shrink-0 p-2 rounded-md transition-colors disabled:opacity-50"
            aria-label={isCurrentlyLiked ? 'Descurtir artigo' : 'Curtir artigo'}
          >
            <Heart
              className={`h-5 w-5 transition-colors ${
                isCurrentlyLiked
                  ? 'fill-red-400 text-red-400'
                  : 'text-gray-300 hover:text-gray-400'
              }`}
            />
          </button>
        </div>

        <div className="flex-1">
          <h3 className="font-serif text-lg font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-accent transition-colors">
            {article.title}
          </h3>

          <p className="text-sm text-muted-foreground mb-3">
            {article.authors.slice(0, 3).join(', ')}
            {article.authors.length > 3 && ` +${article.authors.length - 3} more`}
          </p>

          <p className="text-sm text-muted-foreground line-clamp-3">
            {article.abstract}
          </p>
        </div>

        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border text-accent font-medium text-sm">
          Leia a versão simplificada
          <ArrowRight className="h-4 w-4" />
        </div>
      </article>
    </Link>
  );
}
