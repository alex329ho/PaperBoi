import React from 'react';
import { View, Image } from 'react-native';
import { Card, Text, IconButton } from 'react-native-paper';
import { Article } from '../../store/slices/newsSlice';
import { formatDate } from '../../utils/date';
import { truncate } from '../../utils/string';

interface NewsCardProps {
  article: Article;
  onPress: () => void;
  onSave: () => void;
}

const NewsCard: React.FC<NewsCardProps> = ({ article, onPress, onSave }) => (
  <Card onPress={onPress} style={{ marginBottom: 12 }}>
    {article.imageUrl ? <Image source={{ uri: article.imageUrl }} style={{ height: 180 }} resizeMode="cover" /> : null}
    <Card.Title title={article.title} subtitle={`${article.source} • ${formatDate(article.publishedAt)}`} />
    <Card.Content>
      <Text>{truncate(article.summary)}</Text>
    </Card.Content>
    <Card.Actions>
      <IconButton icon="bookmark-outline" onPress={onSave} accessibilityLabel="Save article" />
    </Card.Actions>
  </Card>
);

export default NewsCard;
