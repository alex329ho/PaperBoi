import React, { useEffect, useMemo, useState } from 'react';
import { LayoutAnimation, Platform, UIManager, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Appbar, Banner, Chip, SegmentedButtons, Text, useTheme } from 'react-native-paper';
import NewsList from '../../components/news/NewsList';
import LoadingSkeletons from '../../components/common/LoadingSkeletons';
import OfflineBanner from '../../components/common/OfflineBanner';
import { useNews } from '../../hooks/useNews';

const topicOptions = ['Technology', 'Business', 'Science', 'Health'];
const regionOptions = ['US', 'Europe', 'Asia', 'Global'];
const languageOptions = ['en', 'es', 'fr'];

const HomeScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const {
    feed,
    saved,
    loadMoreFeed,
    refreshFeed,
    loadFeed,
    offline,
    networkStatus,
    toggleBookmark,
    shareArticle,
  } = useNews();

  const [topics, setTopics] = useState<string[]>(['Technology']);
  const [regions, setRegions] = useState<string[]>(['US']);
  const [languages, setLanguages] = useState<string[]>(['en']);
  const [sortBy, setSortBy] = useState<'recent' | 'trending' | 'relevance'>('recent');

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [feed.items.length]);

  useEffect(() => {
    applyFilters();
    // Re-run feed when sort or filters change for always-fresh data
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, topics, regions, languages]);

  const savedIds = useMemo(() => saved.map((item) => item.id), [saved]);

  const openArticle = (articleId: string) =>
    router.push({ pathname: '/[article_id]', params: { article_id: articleId } });

  const toggleValue = (value: string, list: string[], setter: (next: string[]) => void) => {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

  const applyFilters = () =>
    loadFeed({
      page: 1,
      filter: {
        topics,
        regions,
        languages,
        sortBy,
      },
    });

  const networkLabel = networkStatus?.isConnected ? 'Online' : 'Offline';

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Appbar.Header>
        <Appbar.Content title="PaperBoi" subtitle="Daily briefings" />
        <Appbar.Action icon="tune" accessibilityLabel="Open filters" onPress={applyFilters} />
        <Appbar.Action
          icon="cog"
          accessibilityLabel="Open settings"
          onPress={() => router.push('/(tabs)/settings')}
        />
      </Appbar.Header>

      <Banner
        visible={!!feed.error}
        icon="alert-circle"
        actions={[{ label: 'Retry', onPress: refreshFeed }]}
        accessibilityRole="alert"
      >
        {feed.error}
      </Banner>

      <OfflineBanner />

      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
        <Text variant="titleSmall" style={{ marginBottom: 6 }}>
          Active filters ({networkLabel})
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {topicOptions.map((topic) => (
            <Chip
              key={topic}
              icon="tag"
              selected={topics.includes(topic)}
              onPress={() => toggleValue(topic, topics, setTopics)}
            >
              {topic}
            </Chip>
          ))}
          {regionOptions.map((region) => (
            <Chip
              key={region}
              icon="earth"
              selected={regions.includes(region)}
              onPress={() => toggleValue(region, regions, setRegions)}
            >
              {region}
            </Chip>
          ))}
          {languageOptions.map((lang) => (
            <Chip
              key={lang}
              icon="translate"
              selected={languages.includes(lang)}
              onPress={() => toggleValue(lang, languages, setLanguages)}
            >
              {lang.toUpperCase()}
            </Chip>
          ))}
<<<<<<< ours
          <Chip mode="outlined" icon="account" onPress={() => router.push('/(tabs)/profile')}>
            Profile
          </Chip>
=======
>>>>>>> theirs
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <SegmentedButtons
          value={sortBy}
          onValueChange={(value) => setSortBy(value as typeof sortBy)}
          buttons={[
            { value: 'recent', label: 'Recent', icon: 'clock-outline' },
            { value: 'trending', label: 'Trending', icon: 'fire' },
            { value: 'relevance', label: 'Relevance', icon: 'star-outline' },
          ]}
        />
      </View>

      {feed.loading && !feed.items.length ? (
        <LoadingSkeletons count={3} />
      ) : (
        <NewsList
          articles={feed.items}
          loading={feed.loading}
          refreshing={feed.refreshing}
          onRefresh={refreshFeed}
          onSelect={(article) => openArticle(article.id)}
          onBookmark={toggleBookmark}
          onShare={shareArticle}
          loadMore={loadMoreFeed}
          hasNextPage={feed.hasNextPage}
          savedIds={savedIds}
          emptyLabel="No articles yet. Pull to refresh or update your filters."
        />
      )}

      {offline ? (
        <Banner visible icon="wifi-off" style={{ backgroundColor: colors.surfaceVariant }}>
          Offline mode: showing cached stories. Pull to refresh when reconnected.
        </Banner>
      ) : null}
    </SafeAreaView>
  );
};

export default HomeScreen;
