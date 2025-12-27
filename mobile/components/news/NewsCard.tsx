import React, { useMemo } from 'react';
import { Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';
import { Article } from '../../store/slices/newsSlice';
import { formatDate } from '../../utils/date';
import { truncate } from '../../utils/string';

interface NewsCardProps {
  article: Article;
  onPress: () => void;
  onBookmark: () => void;
  onShare: () => void;
  isBookmarked?: boolean;
  variant?: 'featured' | 'standard';
  label?: string;
}

const NewsCard: React.FC<NewsCardProps> = ({
  article,
  onPress,
  onBookmark,
  onShare,
  isBookmarked,
  variant = 'standard',
  label,
}) => {
  const { colors } = useTheme();
  const meta = useMemo(
    () => `${article.source ?? 'PaperBoi'} • ${formatDate(article.publishedAt)}`,
    [article.publishedAt, article.source],
  );
  const readingTimeLabel = useMemo(
    () => (article.readingTime ? `${article.readingTime} min read` : undefined),
    [article.readingTime],
  );
  const summary = article.summary || article.content;
  const isFeatured = variant === 'featured';
  const displayLabel = label ?? (isFeatured ? 'Top story' : undefined);

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.outline,
        },
      ]}
      accessibilityRole={Platform.OS === 'web' ? 'link' : 'button'}
      accessibilityLabel={`Open article ${article.title}`}
    >
      {article.imageUrl ? (
        <Image
          source={{ uri: article.imageUrl }}
          style={[styles.image, isFeatured && styles.featuredImage]}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.imagePlaceholder,
            { backgroundColor: colors.surfaceVariant },
            isFeatured && styles.featuredImage,
          ]}
        />
      )}
      <View style={styles.content}>
        {displayLabel ? (
          <Text variant="labelSmall" style={[styles.label, { color: colors.tertiary }]}>
            {displayLabel}
          </Text>
        ) : null}
        <Text variant={isFeatured ? 'titleLarge' : 'titleMedium'} style={styles.title}>
          {article.title}
        </Text>
        {summary ? (
          <Text variant="bodyMedium" style={[styles.summary, { color: colors.onSurfaceVariant }]}>
            {truncate(summary, isFeatured ? 200 : 140)}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          <Text variant="labelSmall" style={[styles.metaText, { color: colors.onSurfaceVariant }]}>
            {meta}
          </Text>
          {readingTimeLabel ? (
            <Text
              variant="labelSmall"
              style={[styles.metaText, { color: colors.onSurfaceVariant }]}
            >
              {readingTimeLabel}
            </Text>
          ) : null}
        </View>
        <View style={styles.tagRow}>
          {article.topic ? (
            <View style={[styles.tag, { backgroundColor: colors.primaryContainer }]}>
              <Text variant="labelSmall" style={{ color: colors.onSurface }}>
                {article.topic}
              </Text>
            </View>
          ) : null}
          {article.region ? (
            <View style={[styles.tag, { backgroundColor: colors.surfaceVariant }]}>
              <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
                {article.region}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.actions}>
        <IconButton
          icon="share-variant"
          size={20}
          onPress={(event) => {
            event.stopPropagation();
            onShare();
          }}
          accessibilityLabel="Share article"
        />
        <IconButton
          icon={isBookmarked ? 'bookmark' : 'bookmark-outline'}
          size={20}
          onPress={(event) => {
            event.stopPropagation();
            onBookmark();
          }}
          accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Save article'}
        />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 180,
  },
  featuredImage: {
    height: 220,
  },
  imagePlaceholder: {
    width: '100%',
    height: 180,
  },
  content: {
    padding: 16,
    gap: 6,
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    marginTop: 4,
  },
  summary: {
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  metaText: {
    flexShrink: 1,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
});

export default NewsCard;
