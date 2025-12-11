import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ArticleCard } from '@/components/articles/ArticleCard';
import { SearchBar } from '@/components/search/SearchBar';
import { useAuth } from '@/contexts/AuthContext';
import { articlesApi, topicsApi, usersApi, likesApi } from '@/lib/apiService';
import { Article, Topic } from '@/types';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { BookOpen, Compass, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function Dashboard() {
  const { user, setUser } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [likedArticles, setLikedArticles] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set(['all'])); // 'all', 'liked', or topic IDs
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const subscribedTopics = user?.subscribed_topics || [];
  const subscribedTopicObjects = topics.filter((t) => subscribedTopics.includes(t.id));

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [articlesData, topicsData] = await Promise.all([
          articlesApi.getAll({ page: 1, page_size: 50 }),
          topicsApi.getAll(),
        ]);
        
        // Handle articles response - could be { articles: [], total, page, page_size } or array
        const articlesList = articlesData.articles || articlesData.items || articlesData || [];
        setArticles(Array.isArray(articlesList) ? articlesList : []);
        setTopics(Array.isArray(topicsData) ? topicsData : []);

        // Load likes status for all articles
        if (Array.isArray(articlesList) && articlesList.length > 0) {
          const likedIds: string[] = [];
          for (const article of articlesList) {
            try {
              const likeData = await likesApi.getStatus(article.id);
              if (likeData.is_liked) {
                likedIds.push(article.id);
              }
            } catch (err) {
              // Skip if error loading like status
              console.error(`Error loading like status for article ${article.id}:`, err);
            }
          }
          setLikedArticles(likedIds);
        }
      } catch (err: any) {
        console.error('Error loading data:', err);
        
        // Check if it's an auth error
        if (err?.response?.status === 401) {
          setError('Sua sessão expirou. Por favor, faça login novamente.');
        } else {
          setError('Erro ao carregar artigos. Tente novamente.');
        }
        
        toast({
          title: 'Erro',
          description: 'Falha ao carregar dados.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    let filtered = Array.isArray(articles) ? articles : [];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (article) =>
          article.title.toLowerCase().includes(query) ||
          article.abstract.toLowerCase().includes(query) ||
          article.authors.some((author) =>
            author.toLowerCase().includes(query)
          ) ||
          article.keywords.some((keyword) =>
            keyword.toLowerCase().includes(query)
          )
      );
    }

    // Apply filters cumulatively
    if (selectedFilters.size > 0 && !selectedFilters.has('all')) {
      filtered = filtered.filter((article) => {
        let matches = false;

        // Check if article is in liked articles (if 'liked' filter is selected)
        if (selectedFilters.has('liked') && likedArticles.includes(article.id)) {
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
  }, [searchQuery, selectedFilters, articles, topics, likedArticles]);

  const handleArticleLikeChanged = (articleId: string, isLiked: boolean) => {
    setLikedArticles((prev) => {
      if (isLiked && !prev.includes(articleId)) {
        return [...prev, articleId];
      } else if (!isLiked && prev.includes(articleId)) {
        return prev.filter((id) => id !== articleId);
      }
      return prev;
    });
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
            onSearch={setSearchQuery}
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
            <div className="flex gap-2">
              <button
                onClick={() => toggleFilter('all')}
                className={`topic-badge ${selectedFilters.has('all') ? 'subscribed' : ''}`}
              >
                Todos os artigos
              </button>

              <button
                onClick={() => toggleFilter('liked')}
                className={`topic-badge ${selectedFilters.has('liked') ? 'subscribed' : ''}`}
              >
                ❤️ Curtidos
              </button>
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
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `${filteredArticles.length} artigo${filteredArticles.length !== 1 ? 's' : ''}`
              )}
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive">{error}</p>
            </div>
          ) : filteredArticles.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {filteredArticles.map((article) => (
                <ArticleCard 
                  key={article.id} 
                  article={article}
                  isLiked={likedArticles.includes(article.id)}
                  onLikeChange={handleArticleLikeChanged}
                />
              ))}
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
