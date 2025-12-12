import { useState, useEffect, useRef } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ArticleCard } from '@/components/articles/ArticleCard';
import { SearchBar } from '@/components/search/SearchBar';
import { useAuth } from '@/contexts/AuthContext';
import { useArticles } from '@/contexts/ArticlesContext';
import { useLikes } from '@/contexts/LikesContext';
import { topicsApi } from '@/lib/apiService';
import { Article, Topic } from '@/types';
import { Link } from 'react-router-dom';
import { BookOpen, Compass, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function Dashboard() {
  const { user } = useAuth();
  const { articles, loading, hasMore, fetchArticles, fetchNextPage, searchArticles, showOnlySubscribed, setShowOnlySubscribed } = useArticles();
  const { likedArticles, fetchUserLikes } = useLikes();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set(['all']));
  const [error, setError] = useState<string | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  const subscribedTopics = user?.subscribed_topics || [];
  const subscribedTopicObjects = topics.filter((t) => subscribedTopics.includes(t.id));

  // Fetch articles, topics, and likes on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        
        // Fetch articles from subscribed feed
        await fetchArticles();

        // Always fetch topics
        setTopicsLoading(true);
        const topicsData = await topicsApi.getAll();
        setTopics(Array.isArray(topicsData) ? topicsData : []);

        // Fetch likes
        await fetchUserLikes();
      } catch (err: any) {
        console.error('Error loading data:', err);
        
        if (err?.response?.status === 401) {
          setError('Sua sessão expirou. Por favor, faça login novamente.');
        } else {
          setError('Erro ao carregar dados. Tente novamente.');
        }
        
        toast({
          title: 'Erro',
          description: 'Falha ao carregar dados.',
          variant: 'destructive',
        });
      } finally {
        setTopicsLoading(false);
      }
    };

    loadData();
  }, [fetchArticles, fetchUserLikes]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, fetchNextPage]);

  // Filter articles based on selected filters
  useEffect(() => {
    let filtered = Array.isArray(articles) ? [...articles] : [];

    // If showing only subscribed topics, filter first
    if (showOnlySubscribed && subscribedTopicObjects.length > 0) {
      filtered = filtered.filter((article) => {
        // Check if article matches any subscribed topic
        for (const subscribedTopic of subscribedTopicObjects) {
          const topicNameLower = subscribedTopic.name.toLowerCase();
          
          if (
            article.keywords.some((k) => 
              k.toLowerCase().includes(subscribedTopic.name.toLowerCase()) ||
              topicNameLower.includes(k.toLowerCase())
            ) ||
            article.title.toLowerCase().includes(topicNameLower) ||
            article.abstract.toLowerCase().includes(topicNameLower)
          ) {
            return true;
          }
        }
        return false;
      });
    }

    // Apply additional filters
    if (selectedFilters.size > 0 && !selectedFilters.has('all')) {
      filtered = filtered.filter((article) => {
        let matches = false;

        // Check if article is in liked articles (if 'liked' filter is selected)
        if (selectedFilters.has('liked') && likedArticles.has(article.id)) {
          matches = true;
        }

        // Check if article matches any selected topic
        for (const filterId of selectedFilters) {
          if (filterId === 'liked') continue;
          
          const selectedTopic = topics.find(t => t.id === filterId);
          if (selectedTopic) {
            const topicNameLower = selectedTopic.name.toLowerCase();
            
            if (
              article.keywords.some((k) => 
                k.toLowerCase().includes(selectedTopic.name.toLowerCase()) ||
                topicNameLower.includes(k.toLowerCase())
              ) ||
              article.title.toLowerCase().includes(topicNameLower) ||
              article.abstract.toLowerCase().includes(topicNameLower)
            ) {
              matches = true;
              break;
            }
          }
        }

        return matches;
      });
    }

    setFilteredArticles(filtered);
  }, [selectedFilters, articles, topics, likedArticles, showOnlySubscribed]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    await searchArticles(query);
  };

  const handleArticleLikeChanged = (articleId: string, isLiked: boolean) => {
    // Likes are already managed by context
  };

  const toggleFilter = (filterId: string) => {
    setSelectedFilters((prev) => {
      const newFilters = new Set(prev);

      // If clicking 'all', clear all filters and select only 'all'
      if (filterId === 'all') {
        return new Set(['all']);
      }

      // If 'all' is selected and clicking another filter, remove 'all' and add the new filter
      if (newFilters.has('all')) {
        newFilters.delete('all');
      }

      // Toggle the selected filter
      if (newFilters.has(filterId)) {
        newFilters.delete(filterId);
        // If no filters are selected, select 'all'
        if (newFilters.size === 0) {
          newFilters.add('all');
        }
      } else {
        newFilters.add(filterId);
      }

      // Check if all subscribed topics are selected (excluding 'all' and 'liked')
      const allTopicsSelected = subscribedTopicObjects.every((topic) =>
        newFilters.has(topic.id)
      );
      const onlyTopicsSelected =
        newFilters.size === subscribedTopicObjects.length &&
        subscribedTopicObjects.every((topic) => newFilters.has(topic.id)) &&
        !newFilters.has('all') &&
        !newFilters.has('liked');

      // If all subscribed topics are selected and nothing else, reset to 'all'
      if (allTopicsSelected && onlyTopicsSelected) {
        return new Set(['all']);
      }

      return newFilters;
    });
  };

  return (
    <Layout>
      <div className="container py-8 lg:py-12">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-2">
            Bem-vindo, {user?.name || 'Visitante'}
          </h1>
          <p className="text-muted-foreground">
            Descubra as últimas pesquisas em ciência da computação, simplificadas para você.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <SearchBar
            onSearch={handleSearch}
            placeholder="Busque artigos por título, autor ou palavra-chave..."
          />

          {/* Topic Filter */}
          <div className="space-y-3">
            {/* Separator Line */}
            <div className="flex items-center gap-3 pt-2">
              <div className="flex-1 h-0.5 bg-gradient-to-r from-accent to-transparent"></div>
              <span className="text-sm font-semibold text-accent whitespace-nowrap">Meus Filtros</span>
              <div className="flex-1 h-0.5 bg-gradient-to-l from-accent to-transparent"></div>
            </div>
            
            {/* Main filters - side by side */}
            <div className="flex flex-wrap gap-2 items-center">
              <button
                onClick={() => {
                  setShowOnlySubscribed(false);
                  setSelectedFilters(new Set(['all']));
                }}
                className={`topic-badge ${selectedFilters.has('all') && !showOnlySubscribed ? 'subscribed' : ''}`}
              >
                📰 Todos os artigos
              </button>

              <button
                onClick={() => setShowOnlySubscribed(!showOnlySubscribed)}
                className={`topic-badge ${showOnlySubscribed ? 'subscribed' : ''}`}
              >
                ⭐ Apenas meus tópicos
              </button>

              <button
                onClick={() => toggleFilter('liked')}
                className={`topic-badge ${selectedFilters.has('liked') ? 'subscribed' : ''}`}
              >
                ❤️ Curtidos
              </button>

              {(selectedFilters.size > 1 || (selectedFilters.size === 1 && !selectedFilters.has('all')) || showOnlySubscribed) && (
                <button
                  onClick={() => {
                    setSelectedFilters(new Set(['all']));
                    setShowOnlySubscribed(false);
                    setSearchQuery('');
                  }}
                  className="topic-badge text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  ✕ Limpar
                </button>
              )}
            </div>

            {subscribedTopicObjects.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-2">Tópicos Inscritos</div>
                <div className="flex flex-wrap gap-2">
                  {subscribedTopicObjects.map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => toggleFilter(topic.id)}
                      className={`topic-badge ${selectedFilters.has(topic.id) ? 'subscribed' : ''}`}
                      title={topic.description}
                    >
                      {topic.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Invitation to subscribe to topics */}
            {!topicsLoading && subscribedTopicObjects.length === 0 && (
              <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">Personalize sua experiência!</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Inscreva-se em tópicos de seu interesse para receber artigos relevantes e personalizados.
                    </p>
                    <Link to="/topics">
                      <button className="text-sm font-medium text-accent hover:text-accent/80 transition-colors">
                        Explorar tópicos →
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Articles Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl font-semibold flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-accent" />
              Últimos Artigos
            </h2>
            <span className="text-sm text-muted-foreground">
              {loading && articles.length === 0 ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `${filteredArticles.length} artigo${filteredArticles.length !== 1 ? 's' : ''}`
              )}
            </span>
          </div>

          {loading && articles.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive">{error}</p>
            </div>
          ) : filteredArticles.length > 0 ? (
            <>
              <div className="grid md:grid-cols-2 gap-6">
                {filteredArticles.map((article) => (
                  <ArticleCard 
                    key={article.id} 
                    article={article}
                    isLiked={likedArticles.has(article.id)}
                    onLikeChange={handleArticleLikeChanged}
                  />
                ))}
              </div>

              {/* Infinite scroll observer */}
              {hasMore && (
                <div ref={observerTarget} className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                </div>
              )}
            </>
          ) : subscribedTopicObjects.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex justify-center mb-4">
                <Compass className="h-12 w-12 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground mb-4">
                Você ainda não está inscrito em nenhum tópico.
              </p>
              <Link to="/topics">
                <button className="text-sm font-medium text-accent hover:text-accent/80 transition-colors">
                  Explorar tópicos →
                </button>
              </Link>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Nenhum artigo encontrado correspondente à sua pesquisa.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
