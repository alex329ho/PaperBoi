import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Image } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import { useAppSelector } from '../hooks/useRedux';
import { formatDate } from '../utils/date';
import SummaryActions from '../components/summary/SummaryActions';

const ArticleDetail = () => {
  const { article_id } = useLocalSearchParams<{ article_id: string }>();
  const article = useAppSelector((state) => state.news.articles.find((item) => item.id === article_id));

  if (!article) {
    return (
      <Card style={{ margin: 16 }}>
        <Card.Title title="Article not found" />
        <Card.Content>
          <Text>Try refreshing your feed.</Text>
        </Card.Content>
      </Card>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text variant="headlineSmall" style={{ marginBottom: 8 }}>
        {article.title}
      </Text>
      <Text style={{ marginBottom: 8 }}>
        {article.source} • {formatDate(article.publishedAt)}
      </Text>
      {article.imageUrl ? <Image source={{ uri: article.imageUrl }} style={{ height: 200, marginBottom: 12 }} /> : null}
      <Text style={{ marginBottom: 12 }}>{article.content || article.summary}</Text>
      <SummaryActions content={article.summary} />
    </ScrollView>
  );
};

export default ArticleDetail;
