import React, { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlatList, Image, Linking, ScrollView, View } from 'react-native';
import { ActivityIndicator, Button, Card, Chip, IconButton, Text } from 'react-native-paper';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { formatDate } from '../utils/date';
import SummaryCard from '../components/summary/SummaryCard';
import { useNews } from '../hooks/useNews';
import { fetchArticleDetail } from '../store/thunks/newsThunks';

const ArticleDetail = () => {
  const router = useRouter();
  const { article_id } = useLocalSearchParams() as { article_id?: string };
  const dispatch = useAppDispatch();
  const { saved, toggleBookmark, shareArticle, openExternal } = useNews();
  const { items, loading } = useAppSelector((state) => state.news.feed);
  const searchResults = useAppSelector((state) => state.news.search.results);

  const article = useAppSelector(
    (state) =>
      state.news.feed.items.find((item) => item.id === article_id) ||
      state.news.search.results.find((item) => item.id === article_id)
  );

  useEffect(() => {
    if (!article && article_id) {
      dispatch(fetchArticleDetail(article_id));
    }
  }, [article, article_id, dispatch]);

  if (!article) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        {loading ? <ActivityIndicator /> : <Text accessibilityRole="alert">Article not found. Try refreshing.</Text>}
        <Button onPress={() => router.back()} style={{ marginTop: 12 }}>
          Go back
        </Button>
      </View>
    );
  }

  const isSaved = saved.some((item) => item.id === article.id);
  const related = [...items, ...searchResults].filter((item) => item.id !== article.id).slice(0, 6);
  const readingTimeLabel = article.readingTime ? `${article.readingTime} min read` : 'Quick read';

  const shareByEmail = () => {
    const subject = encodeURIComponent(article.title);
    const body = encodeURIComponent(`${article.summary ?? ''}\n\n${article.url ?? ''}`);
    Linking.openURL(`mailto:?subject=${subject}&body=${body}`).catch(() => shareArticle(article));
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Button icon="arrow-left" onPress={() => router.back()}>
          Back
        </Button>
        <IconButton icon="dots-vertical" onPress={() => shareArticle(article)} accessibilityLabel="Share article" />
      </View>
      <Text variant="headlineSmall" style={{ marginBottom: 8 }}>
        {article.title}
      </Text>
      <Text style={{ marginBottom: 8 }}>
        {article.source} • {formatDate(article.publishedAt)} • {readingTimeLabel}
      </Text>
      {article.imageUrl ? <Image source={{ uri: article.imageUrl }} style={{ height: 200, marginBottom: 12 }} /> : null}
      <SummaryCard title="Summary" summary={article.content || article.summary || ''} expandable />
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {article.region ? <Chip icon="map-marker" compact>{article.region}</Chip> : null}
        {article.language ? <Chip icon="translate" compact>{article.language}</Chip> : null}
        {article.topic ? <Chip icon="tag" compact>{article.topic}</Chip> : null}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        <Button icon="link-variant" mode="outlined" onPress={() => openExternal(article.url)}>
          Read Full
        </Button>
        <Button icon="email" mode="outlined" onPress={shareByEmail}>
          Email
        </Button>
        <IconButton
          icon={isSaved ? 'bookmark' : 'bookmark-outline'}
          onPress={() => toggleBookmark(article)}
          accessibilityLabel={isSaved ? 'Remove bookmark' : 'Save bookmark'}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <Button icon="share-variant" onPress={() => shareArticle(article)}>
          Share
        </Button>
        <Chip icon="shield" compact>
          Source: {article.source}
        </Chip>
      </View>
      <Text variant="titleMedium" style={{ marginBottom: 8 }}>
        Related articles
      </Text>
      <FlatList
        horizontal
        data={related}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card
            style={{ width: 220, marginRight: 12 }}
            onPress={() => router.push({ pathname: '/[article_id]', params: { article_id: item.id } })}
          >
            {item.imageUrl ? <Card.Cover source={{ uri: item.imageUrl }} /> : null}
            <Card.Title title={item.title} subtitle={item.source} titleNumberOfLines={2} subtitleNumberOfLines={1} />
          </Card>
        )}
        showsHorizontalScrollIndicator={false}
        accessibilityLabel="Related articles"
      />
    </ScrollView>
  );
};

export default ArticleDetail;
