import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { Topic } from '@/types';
import { Check, Plus, BookMarked, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useTopics, useSubscribeTopic, useUnsubscribeTopic } from '@/hooks/index';

export default function Topics() {
  const { user, setUser } = useAuth();
  const [togglingTopics, setTogglingTopics] = useState<Set<string>>(new Set());
  
  // React Query hooks
  const { data: topics = [], isLoading, error } = useTopics();
  const subscribeTopic = useSubscribeTopic();
  const unsubscribeTopic = useUnsubscribeTopic();

  const subscribedTopics = user?.subscribed_topics || [];

  const handleToggle = async (topicId: string, topicName: string) => {
    const isSubscribed = subscribedTopics.includes(topicId);
    
    // Optimistic update
    const optimisticSubscribedTopics = isSubscribed
      ? subscribedTopics.filter((id) => id !== topicId)
      : [...subscribedTopics, topicId];
    
    setUser((prevUser) => {
      if (!prevUser) return prevUser;
      return {
        ...prevUser,
        subscribed_topics: optimisticSubscribedTopics,
      };
    });

    try {
      setTogglingTopics((prev) => new Set(prev).add(topicId));
      
      if (isSubscribed) {
        await unsubscribeTopic.mutateAsync(topicId);
        toast({
          title: 'Desinscrito!',
          description: `Você se desinscreveu de ${topicName}`,
        });
      } else {
        await subscribeTopic.mutateAsync(topicId);
        toast({
          title: 'Inscrito!',
          description: `Você agora receberá atualizações sobre ${topicName}`,
        });
      }
    } catch (err: any) {
      console.error('Error toggling topic subscription:', err);
      
      // Revert optimistic update on error
      setUser((prevUser) => {
        if (!prevUser) return prevUser;
        return {
          ...prevUser,
          subscribed_topics: subscribedTopics,
        };
      });
      
      // Handle already subscribed error
      if (err?.response?.status === 400 && err?.response?.data?.detail === "Already subscribed to this topic") {
        toast({
          title: 'Já inscrito',
          description: 'Você já está inscrito neste tópico.',
        });
      } else {
        toast({
          title: 'Erro',
          description: 'Falha ao atualizar inscrição. Tente novamente.',
          variant: 'destructive',
        });
      }
    } finally {
      setTogglingTopics((prev) => {
        const updated = new Set(prev);
        updated.delete(topicId);
        return updated;
      });
    }
  };

  return (
    <Layout>
      <div className="container py-8 lg:py-12">
        {/* Header */}
        <div className="max-w-2xl mb-12">
          <div className="flex items-center gap-3 mb-4">
            <BookMarked className="h-8 w-8 text-accent" />
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground">
              Tópicos de Pesquisa
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Inscreva-se nos tópicos do seu interesse. Você receberá recomendações personalizadas 
            de artigos e atualizações semanais por newsletter com base em suas seleções.
          </p>
        </div>

        {/* Subscribed Count */}
        <div className="mb-8 p-4 bg-accent/10 rounded-lg inline-flex items-center gap-3">
          <Check className="h-5 w-5 text-accent" />
          <span className="text-sm font-medium">
            Inscrito em {subscribedTopics.length} tópico{subscribedTopics.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Topics Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-destructive">
              {error instanceof Error ? error.message : 'Erro ao carregar tópicos. Tente novamente.'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topics.map((topic) => {
              const isSubscribed = subscribedTopics.includes(topic.id);
              const isToggling = togglingTopics.has(topic.id);
              return (
                <button
                  key={topic.id}
                  onClick={() => handleToggle(topic.id, topic.name)}
                  disabled={isToggling}
                  className={`scholarly-card p-6 text-left transition-all disabled:opacity-50 ${
                    isSubscribed ? 'ring-2 ring-accent bg-accent/5' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-serif text-lg font-semibold text-foreground pr-4">
                      {topic.name}
                    </h3>
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        isSubscribed
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {isToggling ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isSubscribed ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {topic.description}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
