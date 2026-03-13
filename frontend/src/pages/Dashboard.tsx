import { useState, useEffect, useRef, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ArticleCard } from '@/components/articles/ArticleCard';
import { SearchBar } from '@/components/search/SearchBar';
import { useAuth } from '@/contexts/AuthContext';
import { useLikes } from '@/contexts/LikesContext';
import { Article, Topic } from '@/types';
import { Link } from 'react-router-dom';
import { BookOpen, Compass, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useSubscribedFeed, useSearchArticles } from '@/hooks/useArticles';
import { useTopics } from '@/hooks/useTopics';

export default function Dashboard() {
  const { user } = useAuth();
  const { likedArticles, fetchUserLikes } = useLikes();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set(['all']));
  const [showOnlySubscribed, setShowOnlySubscribed] = useState(false);
  const [topicsExpanded, setTopicsExpanded] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const topicsContentRef = useRef<HTMLDivElement>(null);
  const [topicsHeight, setTopicsHeight] = useState(0);
  const [topicsAtEnd, setTopicsAtEnd] = useState(true);

  // React Query hooks
  const isSearching = searchQuery.length > 0;
  const subscribedFeed = useSubscribedFeed(
    { search: searchQuery },
    !isSearching
  );
  const searchResults = useSearchArticles(searchQuery, isSearching);
  const topicsQuery = useTopics();

  // Use appropriate query based on search state
  const activeQuery = isSearching ? searchResults : subscribedFeed;
  const { data: topicsData = [] } = topicsQuery;
  const topics = Array.isArray(topicsData) ? topicsData : [];

  // Get all articles from paginated data
  const allArticles = useMemo(() => {
    if (!activeQuery.data?.pages) return [];
    return activeQuery.data.pages.flatMap((page) => page.articles);
  }, [activeQuery.data?.pages]);

  const subscribedTopics = user?.subscribed_topics || [];
  const subscribedTopicObjects = topics.filter((t) => subscribedTopics.includes(t.id));

  // Fetch likes on mount
  useEffect(() => {
    fetchUserLikes();
  }, []);

  // Update topics height when they change or when expanded
  useEffect(() => {
    if (topicsExpanded) {
      setTopicsHeight(280);
      setTopicsAtEnd(false);
    } else {
      setTopicsHeight(0);
    }
  }, [topicsExpanded]);

  // Detect scroll position in topics
  useEffect(() => {
    const topicsContainer = topicsContentRef.current;
    if (!topicsContainer) return;

    const handleScroll = () => {
      const isAtEnd = 
        topicsContainer.scrollHeight - topicsContainer.scrollTop - topicsContainer.clientHeight < 10;
      setTopicsAtEnd(isAtEnd);
    };

    topicsContainer.addEventListener('scroll', handleScroll);
    return () => topicsContainer.removeEventListener('scroll', handleScroll);
  }, [topicsExpanded]);

  // Infinite scroll observer for pagination
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && activeQuery.hasNextPage && !activeQuery.isFetchingNextPage) {
          activeQuery.fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [activeQuery.hasNextPage, activeQuery.isFetchingNextPage, activeQuery.fetchNextPage]);

  // Filter articles based on selected filters
  const filteredArticles = useMemo(() => {
    let filtered = [...allArticles];

    // If showing only subscribed topics, filter first
    if (showOnlySubscribed && subscribedTopicObjects.length > 0) {
      filtered = filtered.filter((article) => {
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

        if (selectedFilters.has('liked') && likedArticles.has(article.id)) {
          matches = true;
        }

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

    return filtered;
  }, [selectedFilters, allArticles, topics, likedArticles, showOnlySubscribed]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setSelectedFilters(new Set(['all']));
  };

  const handleArticleLikeChanged = (articleId: string, isLiked: boolean) => {
    // Likes are already managed by context
  };

  const toggleFilter = (filterId: string) => {
    setSelectedFilters((prev) => {
      const newFilters = new Set(prev);

      if (filterId === 'all') {
        return new Set(['all']);
      }

      if (newFilters.has('all')) {
        newFilters.delete('all');
      }

      if (newFilters.has(filterId)) {
        newFilters.delete(filterId);
        if (newFilters.size === 0) {
          newFilters.add('all');
        }
      } else {
        newFilters.add(filterId);
      }

      const allTopicsSelected = subscribedTopicObjects.every((topic) =>
        newFilters.has(topic.id)
      );
      const onlyTopicsSelected =
        newFilters.size === subscribedTopicObjects.length &&
        subscribedTopicObjects.every((topic) => newFilters.has(topic.id)) &&
        !newFilters.has('all') &&
        !newFilters.has('liked');

      if (allTopicsSelected && onlyTopicsSelected) {
        return new Set(['all']);
      }

      return newFilters;
    });
  };

  // Check for errors from queries
  const isLoading = activeQuery.isLoading || topicsQuery.isLoading;
  const error = activeQuery.error || topicsQuery.error;
  const hasMore = activeQuery.hasNextPage ?? false;

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
                📰 Todos
              </button>

              <button
                onClick={() => setShowOnlySubscribed(!showOnlySubscribed)}
                className={`topic-badge ${showOnlySubscribed ? 'subscribed' : ''}`}
              >
                ⭐ Meus tópicos
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
                
                {/* Desktop: Flex wrap | Mobile: Collapsible */}
                <div className="hidden md:flex md:flex-wrap gap-2">
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

                {/* Mobile: Collapsible accordion */}
                <div className="md:hidden">
                  <button
                    onClick={() => setTopicsExpanded(!topicsExpanded)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-secondary hover:bg-secondary/80 transition-colors mb-2"
                  >
                    <span className="text-sm font-medium">
                      {subscribedTopicObjects.length} tópicos
                    </span>
                    <span className={`transition-transform duration-300 ${topicsExpanded ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </button>

                  {/* Expandable topics list with smooth animation */}
                  <div
                    className="overflow-hidden transition-all duration-300 ease-in-out relative"
                    style={{
                      maxHeight: `${topicsHeight}px`,
                      opacity: topicsExpanded ? 1 : 0,
                    }}
                  >
                    <div ref={topicsContentRef} className="max-h-64 overflow-y-auto pr-2">
                      <div className="flex flex-wrap gap-2 pt-2 pb-4">
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
                    {/* Gradient indicator for more content */}
                    {subscribedTopicObjects.length > 6 && !topicsAtEnd && (
                      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-secondary to-transparent pointer-events-none rounded-b-md"></div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Invitation to subscribe to topics */}
            {!topicsQuery.isLoading && subscribedTopicObjects.length === 0 && (
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
              {isLoading && allArticles.length === 0 ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `${filteredArticles.length} artigo${filteredArticles.length !== 1 ? 's' : ''}`
              )}
            </span>
          </div>

          {isLoading && allArticles.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive">
                {error instanceof Error ? error.message : 'Erro ao carregar dados. Tente novamente.'}
              </p>
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
