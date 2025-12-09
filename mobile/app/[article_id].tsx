import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, Image, View } from 'react-native';
import { Text, Card, Button, IconButton, Chip } from 'react-native-paper';
import { useAppSelector } from '../hooks/useRedux';
import { formatDate } from '../utils/date';
import SummaryCard from '../components/summary/SummaryCard';
import { useNews } from '../hooks/useNews';
import NewsList from '../components/news/NewsList';

const ArticleDetail = () => {
  const router = useRouter();
  const { article_id } = useLocalSearchParams() as { article_id?: string };
  const { saved, toggleBookmark, shareArticle, openExternal, feed } = useNews();
  const article = useAppSelector((state) =>
    state.news.feed.items.find((item) => item.id === article_id) || state.news.search.results.find((item) => item.id === article_id)
  );

  const isSaved = saved.some((item) => item.id === article_id);

  if (!article) {
    return (
      <Card style={{ margin: 16 }}>
        <Card.Title title="Article not found" />
        <Card.Content>
          <Text>Try refreshing your feed.</Text>
        </Card.Content>
        <Card.Actions>
          <Button onPress={() => router.back()}>Go back</Button>
        </Card.Actions>
      </Card>
    );
  }

  const related = feed.items.filter((item) => item.id !== article.id).slice(0, 5);

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
        {article.source} • {formatDate(article.publishedAt)} {article.readingTime ? `• ${article.readingTime} min read` : ''}
      </Text>
      {article.imageUrl ? <Image source={{ uri: article.imageUrl }} style={{ height: 200, marginBottom: 12 }} /> : null}
      <SummaryCard title="Summary" summary={article.content || article.summary} />
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {article.region ? <Chip icon="map-marker" compact>{article.region}</Chip> : null}
        {article.language ? <Chip icon="translate" compact>{article.language}</Chip> : null}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        <Button icon="link-variant" mode="outlined" onPress={() => openExternal(article.url)}>
          Read Full
        </Button>
        <Button icon="email" mode="outlined" onPress={() => shareArticle(article)}>
          Email
        </Button>
        <IconButton
          icon={isSaved ? 'bookmark' : 'bookmark-outline'}
          onPress={() => toggleBookmark(article)}
          accessibilityLabel={isSaved ? 'Remove bookmark' : 'Save bookmark'}
        />
      </View>
      <Text variant="titleMedium" style={{ marginBottom: 8 }}>
        Related articles
      </Text>
      <NewsList
        articles={related}
        onSelect={(item) => router.push({ pathname: '/[article_id]', params: { article_id: item.id } })}
        onBookmark={toggleBookmark}
        onShare={shareArticle}
        hasNextPage={false}
        emptyLabel="No related articles"
        savedIds={saved.map((item) => item.id)}
      />
    </ScrollView>
  );
};

export default ArticleDetail;
