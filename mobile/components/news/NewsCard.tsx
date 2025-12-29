import React, { useEffect, useMemo, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';
import { Article } from '../../store/slices/newsSlice';
import { formatDate } from '../../utils/date';
import { getFaviconUrl, getGeneratedPalette } from '../../utils/image';
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

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'but',
  'by',
  'for',
  'from',
  'has',
  'have',
  'he',
  'her',
  'his',
  'if',
  'in',
  'into',
  'is',
  'it',
  'its',
  'me',
  'more',
  'most',
  'my',
  'new',
  'no',
  'not',
  'of',
  'on',
  'or',
  'our',
  'out',
  'over',
  'said',
  'say',
  'says',
  'she',
  'so',
  'than',
  'that',
  'the',
  'their',
  'then',
  'there',
  'these',
  'they',
  'this',
  'to',
  'up',
  'us',
  'was',
  'we',
  'were',
  'what',
  'when',
  'where',
  'who',
  'why',
  'with',
  'you',
  'your',
]);

const tokenize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

const pickSpecificKeyword = (title?: string, summary?: string) => {
  const titleTokens = title ? tokenize(title) : [];
  const titleCounts = new Map<string, number>();
  titleTokens.forEach((token) => {
    if (token.length < 4 || STOP_WORDS.has(token)) return;
    titleCounts.set(token, (titleCounts.get(token) ?? 0) + 1);
  });

  const titleCandidates = [...titleCounts.entries()].sort(
    (a, b) => b[0].length - a[0].length || b[1] - a[1],
  );
  if (titleCandidates.length) return titleCandidates[0][0];

  const fallbackTokens = tokenize([title, summary].filter(Boolean).join(' '));
  const fallbackCounts = new Map<string, number>();
  fallbackTokens.forEach((token) => {
    if (token.length < 4 || STOP_WORDS.has(token)) return;
    fallbackCounts.set(token, (fallbackCounts.get(token) ?? 0) + 1);
  });

  const fallbackCandidates = [...fallbackCounts.entries()].sort(
    (a, b) => b[0].length - a[0].length || b[1] - a[1],
  );
  return fallbackCandidates.length ? fallbackCandidates[0][0] : undefined;
};

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
  const faviconUrl = useMemo(() => getFaviconUrl(article.url), [article.url]);
  const fallbackImageUrl = useMemo(() => {
    if (!__DEV__) return undefined;
    return `https://picsum.photos/seed/${encodeURIComponent(imageSeed)}/1200/800`;
  }, [imageSeed]);
  const imageUrl = article.imageUrl || fallbackImageUrl;
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !imageFailed;
  const keywordText = useMemo(() => {
    const keyword = pickSpecificKeyword(article.title, summary);
    if (keyword) {
      return keyword.toUpperCase();
    }
    const fallback = [article.topic, article.region, article.source].filter(Boolean);
    return fallback[0]?.toUpperCase() || 'PAPERBOI';
  }, [article.region, article.source, article.title, article.topic, summary]);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

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
        {showImage ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.imageAsset}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <>
            <View style={[styles.imageAccent, { backgroundColor: palette.accent }]} />
            <View style={[styles.imageGlow, { backgroundColor: palette.text }]} />
          </>
        )}
        {faviconUrl ? (
          <View style={[styles.faviconWrap, { borderColor: palette.text }]}>
            <Image source={{ uri: faviconUrl }} style={styles.favicon} resizeMode="contain" />
          </View>
        ) : (
          <Text variant="headlineSmall" style={styles.keywordText} numberOfLines={2}>
            {keywordText}
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
  imageAsset: {
    ...StyleSheet.absoluteFillObject,
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
  keywordText: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    textAlign: 'center',
    paddingHorizontal: 12,
    zIndex: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  faviconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
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
