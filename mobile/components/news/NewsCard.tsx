import React, { useMemo } from 'react';
import { Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';
import { Article } from '../../store/slices/newsSlice';
import { formatDate } from '../../utils/date';
import { getFaviconUrl, getGeneratedPalette, getInitials } from '../../utils/image';
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
  const imageSeed = article.source || article.url || article.title || 'paperboi';
  const palette = useMemo(() => getGeneratedPalette(imageSeed), [imageSeed]);
  const initials = useMemo(
    () => getInitials(article.source || article.title || article.url),
    [article.source, article.title, article.url],
  );
  const faviconUrl = useMemo(() => getFaviconUrl(article.url), [article.url]);

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
      <View
        style={[
          styles.imageBase,
          isFeatured && styles.featuredImage,
          { backgroundColor: palette.background },
        ]}
      >
        <View style={[styles.imageAccent, { backgroundColor: palette.accent }]} />
        <View style={[styles.imageGlow, { backgroundColor: palette.text }]} />
        {faviconUrl ? (
          <View style={[styles.faviconWrap, { borderColor: palette.text }]}>
            <Image source={{ uri: faviconUrl }} style={styles.favicon} resizeMode="contain" />
          </View>
        ) : (
          <Text variant="headlineSmall" style={[styles.imageInitials, { color: palette.text }]}>
            {initials}
          </Text>
        )}
      </View>
      <View style={styles.content}>
        {displayLabel ? (
          <Text variant="labelSmall" style={[styles.label, { color: colors.tertiary }]}>
            {displayLabel}
          </Text>
        ) : null}
        <Text variant="titleLarge" style={styles.title}>
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
  imageBase: {
    width: '100%',
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  featuredImage: {
    height: 220,
  },
  imageAccent: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.45,
    transform: [{ skewY: '-6deg' }],
  },
  imageGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.12,
    top: -60,
    right: -80,
  },
  imageInitials: {
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  faviconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favicon: {
    width: 32,
    height: 32,
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
