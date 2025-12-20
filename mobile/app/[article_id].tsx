import React, { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlatList, ImageBackground, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Chip, IconButton, Text, useTheme } from 'react-native-paper';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { formatDate } from '../utils/date';
import SummaryCard from '../components/summary/SummaryCard';
import { useNews } from '../hooks/useNews';
import { fetchArticleDetail } from '../store/thunks/newsThunks';

const ArticleDetail = () => {
  const router = useRouter();
  const { article_id } = useLocalSearchParams() as { article_id?: string };
  const { colors, dark } = useTheme();
  const dispatch = useAppDispatch();
  const { saved, toggleBookmark, shareArticle, openExternal } = useNews();
  const { items, loading } = useAppSelector((state) => state.news.feed);
  const searchResults = useAppSelector((state) => state.news.search.results);

  const article = useAppSelector(
    (state) =>
      state.news.feed.items.find((item) => item.id === article_id) ||
      state.news.search.results.find((item) => item.id === article_id),
  );

  useEffect(() => {
    if (!article && article_id) {
      dispatch(fetchArticleDetail(article_id));
    }
  }, [article, article_id, dispatch]);

  if (!article) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <Text accessibilityRole="alert">Article not found. Try refreshing.</Text>
        )}
        <Button onPress={() => router.back()} style={{ marginTop: 12 }}>
          Go back
        </Button>
      </View>
    );
  }

  const isSaved = saved.some((item) => item.id === article.id);
  const related = [...items, ...searchResults].filter((item) => item.id !== article.id).slice(0, 6);
  const readingTimeLabel = article.readingTime ? `${article.readingTime} min read` : 'Quick read';
  const lead = article.summary || article.content;
  const showSummaryCard = Boolean(article.summary && article.content);

  const shareByEmail = () => {
    const subject = encodeURIComponent(article.title);
    const body = encodeURIComponent(`${article.summary ?? ''}\n\n${article.url ?? ''}`);
    Linking.openURL(`mailto:?subject=${subject}&body=${body}`).catch(() => shareArticle(article));
  };

  const heroTextColor = dark ? colors.onSurface : colors.onPrimary;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.heroWrapper}>
        {article.imageUrl ? (
          <ImageBackground source={{ uri: article.imageUrl }} style={styles.hero} resizeMode="cover">
            <View style={styles.heroOverlay} />
            <View style={styles.heroTop}>
                <IconButton
                  icon="arrow-left"
                  iconColor={heroTextColor}
                  onPress={() => router.back()}
                  accessibilityLabel="Go back"
                />
                <View style={styles.heroActions}>
                  <IconButton
                    icon="share-variant"
                    iconColor={heroTextColor}
                    onPress={() => shareArticle(article)}
                    accessibilityLabel="Share article"
                  />
                  <IconButton
                    icon={isSaved ? 'bookmark' : 'bookmark-outline'}
                    iconColor={heroTextColor}
                    onPress={() => toggleBookmark(article)}
                    accessibilityLabel={isSaved ? 'Remove bookmark' : 'Save article'}
                  />
              </View>
            </View>
            <View style={styles.heroContent}>
              <Text variant="headlineLarge" style={[styles.heroTitle, { color: heroTextColor }]}>
                {article.title}
              </Text>
              <Text variant="labelLarge" style={{ color: heroTextColor }}>
                {article.source} • {formatDate(article.publishedAt)} • {readingTimeLabel}
              </Text>
            </View>
          </ImageBackground>
        ) : (
          <View style={[styles.heroFallback, { backgroundColor: colors.surfaceVariant }]}>
            <View style={styles.heroTop}>
              <IconButton icon="arrow-left" onPress={() => router.back()} />
              <View style={styles.heroActions}>
                <IconButton icon="share-variant" onPress={() => shareArticle(article)} />
                <IconButton
                  icon={isSaved ? 'bookmark' : 'bookmark-outline'}
                  onPress={() => toggleBookmark(article)}
                />
              </View>
            </View>
            <View style={styles.heroContent}>
              <Text variant="headlineLarge">{article.title}</Text>
              <Text variant="labelLarge" style={{ color: colors.onSurfaceVariant }}>
                {article.source} • {formatDate(article.publishedAt)} • {readingTimeLabel}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.body}>
        {lead ? (
          <Text variant="bodyLarge" style={[styles.lead, { color: colors.onSurface }]}>
            {lead}
          </Text>
        ) : null}

        {showSummaryCard ? (
          <SummaryCard title="Summary" summary={article.content || ''} expandable />
        ) : null}

        <View style={styles.metaRow}>
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
          {article.topic ? (
            <Chip icon="tag" compact>
              {article.topic}
            </Chip>
          ) : null}
        </View>

        <View style={styles.actionRow}>
          <Button icon="link-variant" mode="outlined" onPress={() => openExternal(article.url)}>
            Read full
          </Button>
          <Button icon="email" mode="outlined" onPress={shareByEmail}>
            Email
          </Button>
          <Button icon="share-variant" mode="contained" onPress={() => shareArticle(article)}>
            Share
          </Button>
        </View>

        <View style={styles.sourceRow}>
          <Text variant="titleSmall">Read more from {article.source}</Text>
        </View>

        <FlatList
          horizontal
          data={related}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card
              style={[styles.relatedCard, { backgroundColor: colors.surface }]}
              onPress={() =>
                router.push({ pathname: '/[article_id]', params: { article_id: item.id } })
              }
            >
              {item.imageUrl ? <Card.Cover source={{ uri: item.imageUrl }} /> : null}
              <Card.Content>
                <Text variant="titleSmall" numberOfLines={2}>
                  {item.title}
                </Text>
                <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
                  {item.source}
                </Text>
              </Card.Content>
            </Card>
          )}
          showsHorizontalScrollIndicator={false}
          accessibilityLabel="Related articles"
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  heroWrapper: {
    minHeight: 280,
  },
  hero: {
    height: 300,
    justifyContent: 'space-between',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  heroTop: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 8,
  },
  heroTitle: {
    fontWeight: '700',
  },
  heroFallback: {
    paddingBottom: 20,
  },
  body: {
    padding: 16,
    gap: 12,
  },
  lead: {
    fontWeight: '600',
    lineHeight: 24,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  sourceRow: {
    marginTop: 8,
  },
  relatedCard: {
    width: 220,
    marginRight: 12,
  },
});

export default ArticleDetail;
