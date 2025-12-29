import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlatList, Image, ImageBackground, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Chip, IconButton, Text, useTheme } from 'react-native-paper';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { formatDate } from '../utils/date';
import { getFaviconUrl, getGeneratedPalette, getInitials } from '../utils/image';
import SummaryCard from '../components/summary/SummaryCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import LoadingAnimation from '../components/common/LoadingAnimation';
import { useNews } from '../hooks/useNews';
import { fetchArticleDetail, generateSummary } from '../store/thunks/newsThunks';

const ArticleDetail = () => {
  const router = useRouter();
  const { article_id } = useLocalSearchParams() as { article_id?: string };
  const normalizedId = article_id ? String(article_id) : undefined;
  const { colors, dark } = useTheme();
  const dispatch = useAppDispatch();
  const { saved, toggleBookmark, shareArticle, openExternal } = useNews();
  const { items, loading } = useAppSelector((state) => state.news.feed);
  const searchResults = useAppSelector((state) => state.news.search.results);
  const summaryLength = useAppSelector((state) => state.preferences.summaryLength);
  const summaries = useAppSelector((state) => state.news.summaries);
  const reports = useAppSelector((state) => state.news.reports);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [heroImageFailed, setHeroImageFailed] = useState(false);

  const article = useAppSelector(
    (state) => {
      if (!normalizedId) return undefined;
      const matchesId = (item: { id: string | number }) => String(item.id) === normalizedId;
      return (
        state.news.feed.items.find(matchesId) ||
        state.news.search.results.find(matchesId) ||
        state.news.articles.find(matchesId)
      );
    },
  );

  useEffect(() => {
    if (!article && article_id) {
      dispatch(fetchArticleDetail(article_id));
    }
  }, [article, article_id, dispatch]);

  const summaryKey = article ? String(article.id) : normalizedId;
  const summaryText = article?.summary ?? (summaryKey ? summaries[summaryKey] : undefined);
  const report = summaryKey ? reports[summaryKey] : undefined;
  const normalizedReport = report
    ? {
        summary: report.summary || summaryText || '',
        key_insights: Array.isArray(report.key_insights) ? report.key_insights : [],
        implications: Array.isArray(report.implications) ? report.implications : [],
        outlook: Array.isArray(report.outlook)
          ? report.outlook
          : report.outlook
            ? [report.outlook]
            : [],
        risks: Array.isArray(report.risks) ? report.risks : [],
        action_items: Array.isArray(report.action_items) ? report.action_items : [],
        data_graph: report.data_graph || { title: '', type: 'bar', series: [] },
      }
    : undefined;

  const heroSeed = article?.source || article?.url || article?.title || 'paperboi';
  const heroPalette = getGeneratedPalette(heroSeed);
  const faviconUrl = getFaviconUrl(article?.url);
  const faviconFallback = getInitials(article?.source || article?.title || article?.url);
  const fallbackImageUrl = __DEV__
    ? `https://picsum.photos/seed/${encodeURIComponent(heroSeed)}/1400/900`
    : undefined;
  const heroImageUrl = article?.imageUrl || fallbackImageUrl;
  const showHeroImage = Boolean(heroImageUrl) && !heroImageFailed;
  const heroTextColor = dark ? colors.onSurface : colors.onPrimary;
  const graphBarColor = colors.primary;
  const sectionTitleStyle = { fontSize: 20, lineHeight: 26 };

  useEffect(() => {
    if (!article || !summaryKey || normalizedReport || isSummarizing) {
      return;
    }
    setIsSummarizing(true);
    const normalizedLength =
      typeof summaryLength === 'string'
        ? (summaryLength.toUpperCase() as 'SHORT' | 'MEDIUM' | 'LONG')
        : 'MEDIUM';
    const result = dispatch(
      generateSummary({
        articleId: summaryKey,
        length: normalizedLength,
      }),
    );
    Promise.resolve(result).finally(() => setIsSummarizing(false));
  }, [article, dispatch, isSummarizing, normalizedReport, summaryKey, summaryLength]);

  useEffect(() => {
    setHeroImageFailed(false);
  }, [heroImageUrl]);

  if (!article) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        {loading ? (
          <LoadingSpinner />
        ) : (
          <Text accessibilityRole="alert">Article not found. Try refreshing.</Text>
        )}
        <Button onPress={() => router.back()} style={{ marginTop: 12 }}>
          Go back
        </Button>
      </View>
    );
  }

  const isSaved = saved.some((item) => String(item.id) === String(article.id));
  const related = [...items, ...searchResults]
    .filter((item) => !normalizedId || String(item.id) !== normalizedId)
    .slice(0, 6);
  const readingTimeLabel = article.readingTime ? `${article.readingTime} min read` : 'Quick read';

  const shareByEmail = () => {
    const subject = encodeURIComponent(article.title);
    const body = encodeURIComponent(`${normalizedReport?.summary ?? summaryText ?? ''}\n\n${article.url ?? ''}`);
    Linking.openURL(`mailto:?subject=${subject}&body=${body}`).catch(() => shareArticle(article));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.heroWrapper}>
        {showHeroImage ? (
          <ImageBackground
            source={{ uri: heroImageUrl }}
            style={styles.hero}
            resizeMode="cover"
            onError={() => setHeroImageFailed(true)}
          >
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
              <Text
                variant="displaySmall"
                style={[styles.heroTitle, { color: heroTextColor, fontSize: 30, lineHeight: 36 }]}
              >
                {article.title}
              </Text>
              <Text
                variant="titleMedium"
                style={{ color: heroTextColor, fontSize: 18, lineHeight: 24 }}
              >
                {article.source} • {formatDate(article.publishedAt)} • {readingTimeLabel}
              </Text>
            </View>
          </ImageBackground>
        ) : (
          <View style={[styles.heroFallback, { backgroundColor: heroPalette.background }]}>
            <View style={[styles.heroAccent, { backgroundColor: heroPalette.accent }]} />
            <View style={[styles.heroGlow, { backgroundColor: heroPalette.text }]} />
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
            <View
              style={[
                styles.heroBadge,
                {
                  borderColor: heroPalette.text,
                  backgroundColor: faviconUrl
                    ? 'rgba(255, 255, 255, 0.85)'
                    : heroPalette.accent,
                },
              ]}
            >
              {faviconUrl ? (
                <Image source={{ uri: faviconUrl }} style={styles.heroFavicon} resizeMode="contain" />
              ) : (
                <Text style={styles.heroFallbackText}>{faviconFallback}</Text>
              )}
            </View>
            <View style={styles.heroContent}>
              <Text variant="headlineLarge" style={{ color: heroPalette.text }}>
                {article.title}
              </Text>
              <Text variant="labelLarge" style={{ color: colors.onSurfaceVariant }}>
                {article.source} • {formatDate(article.publishedAt)} • {readingTimeLabel}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.body}>
        {normalizedReport ? (
          <View style={{ gap: 12 }}>
            <SummaryCard
              title="Summary"
              summary={normalizedReport.summary}
              expandable
              defaultExpanded
              titleStyle={sectionTitleStyle}
            />
            <Card mode="outlined" style={styles.reportCard}>
              <Card.Title title="Key Insights" titleStyle={sectionTitleStyle} />
              <Card.Content>
                {normalizedReport.key_insights.map((item, index) => (
                  <Text key={`insight-${index}`} style={styles.bullet}>
                    • {item}
                  </Text>
                ))}
              </Card.Content>
            </Card>
            <Card mode="outlined" style={styles.reportCard}>
              <Card.Title title="Implications" titleStyle={sectionTitleStyle} />
              <Card.Content>
                {normalizedReport.implications.map((item, index) => (
                  <Text key={`implication-${index}`} style={styles.bullet}>
                    • {item}
                  </Text>
                ))}
              </Card.Content>
            </Card>
            <Card mode="outlined" style={styles.reportCard}>
              <Card.Title title="Outlook" titleStyle={sectionTitleStyle} />
              <Card.Content>
                {normalizedReport.outlook.map((item, index) => (
                  <Text key={`outlook-${index}`} style={styles.bullet}>
                    • {item}
                  </Text>
                ))}
              </Card.Content>
            </Card>
            <Card mode="outlined" style={styles.reportCard}>
              <Card.Title title="Risks" titleStyle={sectionTitleStyle} />
              <Card.Content>
                {normalizedReport.risks.map((item, index) => (
                  <Text key={`risk-${index}`} style={styles.bullet}>
                    • {item}
                  </Text>
                ))}
              </Card.Content>
            </Card>
            <Card mode="outlined" style={styles.reportCard}>
              <Card.Title title="Action Items" titleStyle={sectionTitleStyle} />
              <Card.Content>
                {normalizedReport.action_items.map((item, index) => (
                  <Text key={`action-${index}`} style={styles.bullet}>
                    • {item}
                  </Text>
                ))}
              </Card.Content>
            </Card>
            {normalizedReport.data_graph?.series?.length ? (
              <Card mode="outlined" style={styles.reportCard}>
                <Card.Title
                  title={normalizedReport.data_graph.title || 'Data'}
                  titleStyle={sectionTitleStyle}
                />
                <Card.Content>
                  {(() => {
                    const series = normalizedReport.data_graph.series;
                    const maxValue = Math.max(...series.map((item) => item.value), 1);
                    return series.map((item, index) => (
                      <View key={`graph-${index}`} style={styles.graphRow}>
                        <Text style={styles.graphLabel}>{item.label}</Text>
                        <View style={styles.graphTrack}>
                          <View
                            style={[
                              styles.graphBar,
                              { backgroundColor: graphBarColor },
                              { width: `${Math.round((item.value / maxValue) * 100)}%` },
                            ]}
                          />
                        </View>
                        <Text style={styles.graphValue}>{item.value}</Text>
                      </View>
                    ));
                  })()}
                </Card.Content>
              </Card>
            ) : null}
          </View>
        ) : summaryText ? (
          <SummaryCard
            title="Summary"
            summary={summaryText}
            expandable
            defaultExpanded
            titleStyle={sectionTitleStyle}
          />
        ) : isSummarizing ? (
          <View style={{ alignItems: 'center', paddingVertical: 16 }}>
            <LoadingAnimation size={80} accessibilityLabel="Generating report" />
            <Text variant="bodyMedium" style={{ marginTop: 8, color: colors.onSurfaceVariant }}>
              Generating report...
            </Text>
          </View>
        ) : (
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
            Summary unavailable. Try again later.
          </Text>
        )}

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
    </SafeAreaView>
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
  heroAccent: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.45,
    transform: [{ skewY: '-6deg' }],
  },
  heroGlow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.12,
    top: -80,
    right: -90,
  },
  heroBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
    marginTop: 8,
    borderWidth: 1,
    zIndex: 2,
  },
  heroFavicon: {
    width: 32,
    height: 32,
  },
  heroFallbackText: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  body: {
    padding: 16,
    gap: 12,
  },
  reportCard: {
    backgroundColor: 'transparent',
  },
  bullet: {
    marginBottom: 6,
  },
  graphRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  graphLabel: {
    width: 90,
  },
  graphTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  graphBar: {
    height: 8,
    borderRadius: 999,
  },
  graphValue: {
    width: 32,
    textAlign: 'right',
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
