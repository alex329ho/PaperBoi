import React, { useMemo } from 'react';
import { Image, View } from 'react-native';
import { Card, Text, IconButton, Button, Chip } from 'react-native-paper';
import { Article } from '../../store/slices/newsSlice';
import { formatDate } from '../../utils/date';
import { truncate } from '../../utils/string';

interface NewsCardProps {
  article: Article;
  onPress: () => void;
  onBookmark: () => void;
  onShare: () => void;
  isBookmarked?: boolean;
}

const NewsCard: React.FC<NewsCardProps> = ({
  article,
  onPress,
  onBookmark,
  onShare,
  isBookmarked,
}) => {
  const meta = useMemo(
    () => `${article.source} • ${formatDate(article.publishedAt)}`,
    [article.publishedAt, article.source],
  );
  const readingTimeLabel = useMemo(
    () => (article.readingTime ? `${article.readingTime} min read` : undefined),
    [article.readingTime],
  );

  return (
    <Card
      onPress={onPress}
      style={{ marginBottom: 12 }}
      accessibilityRole="button"
      accessibilityLabel={`Open article ${article.title}`}
    >
      {article.imageUrl ? (
        <Image source={{ uri: article.imageUrl }} style={{ height: 180 }} resizeMode="cover" />
      ) : null}
      <Card.Title
        title={article.title}
        subtitle={meta}
        titleNumberOfLines={2}
        subtitleNumberOfLines={2}
      />
      <Card.Content>
        <Text variant="bodyMedium" selectable>
          {truncate(article.summary, 220)}
        </Text>
        <View style={{ flexDirection: 'row', marginTop: 8, flexWrap: 'wrap', gap: 6 }}>
          {article.region ? (
            <Chip icon="map-marker" compact>
              {article.region}
            </Chip>
          ) : null}
          {article.language ? (
            <Chip icon="translate" compact>
              {article.language}
            </Chip>
          ) : null}
          {readingTimeLabel ? (
            <Chip icon="clock-outline" compact>
              {readingTimeLabel}
            </Chip>
          ) : null}
        </View>
      </Card.Content>
      <Card.Actions>
        <Button onPress={onPress} accessibilityLabel="Read more">
          Read More
        </Button>
        <IconButton icon="share-variant" onPress={onShare} accessibilityLabel="Share article" />
        <IconButton
          icon={isBookmarked ? 'bookmark' : 'bookmark-outline'}
          onPress={onBookmark}
          accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Save article'}
        />
      </Card.Actions>
    </Card>
  );
};

export default NewsCard;
