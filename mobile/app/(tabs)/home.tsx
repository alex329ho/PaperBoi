import React, { useEffect, useMemo, useState } from 'react';
import { Image, LayoutAnimation, Platform, Pressable, UIManager, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Appbar, Banner, Chip, SegmentedButtons, Text, useTheme } from 'react-native-paper';
import NewsList from '../../components/news/NewsList';
import LoadingSkeletons from '../../components/common/LoadingSkeletons';
import OfflineBanner from '../../components/common/OfflineBanner';
import { useNews } from '../../hooks/useNews';

const sectionOptions = ['Today', 'Technology', 'Business', 'Science', 'Health', 'Saved'];
const regionOptions = ['US', 'Europe', 'Asia', 'Global'];
const languageOptions = ['en', 'es', 'fr'];
const appIcon = require('../../assets/icon.png');

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
    toggleBookmark,
    shareArticle,
  } = useNews();

  const [activeSection, setActiveSection] = useState('Today');
  const [topics, setTopics] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>(['US']);
  const [languages, setLanguages] = useState<string[]>(['en']);
  const [sortBy, setSortBy] = useState<'recent' | 'trending' | 'relevance'>('recent');
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  const chipStyle = (selected: boolean) => ({
    backgroundColor: selected ? colors.primaryContainer : colors.surfaceVariant,
  });

  const chipTextStyle = (selected: boolean) => ({
    color: selected ? colors.onPrimaryContainer : colors.onSurfaceVariant,
  });

  const handleSectionSelect = (section: string) => {
    if (section === 'Saved') {
      setActiveSection(section);
      router.push('/(tabs)/saved');
      return;
    }
    setActiveSection(section);
    if (section === 'Today') {
      setSortBy('recent');
      setTopics([]);
      return;
    }
    setSortBy('recent');
    setTopics([section]);
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
  const toggleFilters = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFiltersOpen((prev) => !prev);
  };
  const resetHome = () => {
    const nextRegions = ['US'];
    const nextLanguages = ['en'];
    const nextTopics: string[] = [];
    const nextSort: typeof sortBy = 'recent';
    setActiveSection('Today');
    setRegions(nextRegions);
    setLanguages(nextLanguages);
    setTopics(nextTopics);
    setSortBy(nextSort);
    loadFeed({
      page: 1,
      filter: {
        topics: nextTopics,
        regions: nextRegions,
        languages: nextLanguages,
        sortBy: nextSort,
      },
    });
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['left', 'right', 'bottom']}
    >
      <Appbar.Header style={{ backgroundColor: colors.surface }}>
        <Pressable
          onPress={resetHome}
          accessibilityRole="button"
          accessibilityLabel="Reload home feed"
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 16 }}
        >
          <Image
            source={appIcon}
            accessibilityLabel="PaperBoi app icon"
            style={{ width: 44, height: 44, marginRight: 12, borderRadius: 10 }}
            resizeMode="contain"
          />
          <View>
            <Text
              variant="titleLarge"
              style={{
                fontFamily: 'RozhaOne-Bold',
                letterSpacing: 0.4,
                fontSize: 26,
                lineHeight: 30,
              }}
            >
              PaperBoi
            </Text>
          </View>
        </Pressable>
        <Appbar.Action
          icon="magnify"
          accessibilityLabel="Search articles"
          onPress={() => router.push('/(tabs)/search')}
        />
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

      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <Text
          variant="titleSmall"
          style={{ marginBottom: 8, color: colors.onSurfaceVariant, fontSize: 18, lineHeight: 22 }}
        >
          Sort
        </Text>
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

      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 }}>
        <Pressable
          onPress={toggleFilters}
          accessibilityRole="button"
          accessibilityLabel="Toggle filters"
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Text
            variant="titleSmall"
            style={{ color: colors.onSurfaceVariant, fontSize: 18, lineHeight: 22 }}
          >
            Filters
          </Text>
          <MaterialCommunityIcons
            name={filtersOpen ? 'chevron-up' : 'chevron-down'}
            size={22}
            color={colors.onSurfaceVariant}
          />
        </Pressable>
        {filtersOpen ? (
          <View style={{ marginTop: 8, gap: 12 }}>
            <View>
              <Text variant="labelLarge" style={{ color: colors.onSurfaceVariant, marginBottom: 6 }}>
                Topics
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {sectionOptions.map((section) => (
                  <Chip
                    key={section}
                    icon="tag"
                    selected={activeSection === section}
                    onPress={() => handleSectionSelect(section)}
                    style={chipStyle(activeSection === section)}
                    textStyle={chipTextStyle(activeSection === section)}
                  >
                    {section}
                  </Chip>
                ))}
              </View>
            </View>
            <View>
              <Text variant="labelLarge" style={{ color: colors.onSurfaceVariant, marginBottom: 6 }}>
                Regions
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {regionOptions.map((region) => (
                  <Chip
                    key={region}
                    icon="earth"
                    selected={regions.includes(region)}
                    onPress={() => toggleValue(region, regions, setRegions)}
                    style={chipStyle(regions.includes(region))}
                    textStyle={chipTextStyle(regions.includes(region))}
                  >
                    {region}
                  </Chip>
                ))}
              </View>
            </View>
            <View>
              <Text variant="labelLarge" style={{ color: colors.onSurfaceVariant, marginBottom: 6 }}>
                Languages
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {languageOptions.map((lang) => (
                  <Chip
                    key={lang}
                    icon="translate"
                    selected={languages.includes(lang)}
                    onPress={() => toggleValue(lang, languages, setLanguages)}
                    style={chipStyle(languages.includes(lang))}
                    textStyle={chipTextStyle(languages.includes(lang))}
                  >
                    {lang.toUpperCase()}
                  </Chip>
                ))}
              </View>
            </View>
          </View>
        ) : null}
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
