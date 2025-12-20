import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Button,
  Chip,
  Divider,
  HelperText,
  Searchbar,
  SegmentedButtons,
  Text,
  TextInput,
} from 'react-native-paper';
import NewsCard from '../../components/news/NewsCard';
import LoadingSkeletons from '../../components/common/LoadingSkeletons';
import { useNews } from '../../hooks/useNews';
import { Article } from '../../store/slices/newsSlice';

const topics = ['Technology', 'Business', 'Health', 'Sports', 'Science'];
const regions = ['US', 'Europe', 'Asia', 'Africa', 'Global'];
const languages = ['en', 'es', 'fr', 'de'];

const SearchScreen = () => {
  const router = useRouter();
  const {
    search,
    recentSearches,
    executeSearch,
    loadMoreResults,
    saveRecent,
    toggleBookmark,
    saved,
    shareArticle,
  } = useNews();
  const [query, setQuery] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [sort, setSort] = useState<'recent' | 'relevance'>('recent');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const showDateError = Boolean(dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo));

  const buildSearchParams = () => ({
    query,
    page: 1,
    filter: {
      topics: selectedTopics,
      regions: selectedRegions,
      languages: selectedLanguages,
      sortBy: sort,
    },
    startDate: showDateError || !dateFrom ? undefined : dateFrom,
    endDate: showDateError || !dateTo ? undefined : dateTo,
  });

  useEffect(() => {
    const handler = setTimeout(() => {
      if (query.trim().length > 2) {
        executeSearch(buildSearchParams());
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [
    executeSearch,
    query,
    selectedLanguages,
    selectedRegions,
    selectedTopics,
    sort,
    dateFrom,
    dateTo,
    showDateError,
  ]);

  const toggleValue = (value: string, list: string[], setter: (next: string[]) => void) => {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

  const handleSubmit = () => {
    if (!query.trim()) return;
    executeSearch(buildSearchParams());
    saveRecent([query, ...recentSearches.filter((item) => item !== query)].slice(0, 10));
  };

  const hasNoResults = !search.loading && !search.results.length && query.length > 2;
  const savedIds = useMemo(() => saved.map((item) => item.id), [saved]);

  const renderHeader = () => (
    <View style={{ padding: 16 }}>
      <Searchbar
        placeholder="Search articles"
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={handleSubmit}
        accessibilityLabel="Search articles"
      />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {topics.map((topic) => (
          <Chip
            key={topic}
            selected={selectedTopics.includes(topic)}
            onPress={() => toggleValue(topic, selectedTopics, setSelectedTopics)}
          >
            {topic}
          </Chip>
        ))}
        {regions.map((region) => (
          <Chip
            key={region}
            selected={selectedRegions.includes(region)}
            onPress={() => toggleValue(region, selectedRegions, setSelectedRegions)}
          >
            {region}
          </Chip>
        ))}
        {languages.map((lang) => (
          <Chip
            key={lang}
            selected={selectedLanguages.includes(lang)}
            onPress={() => toggleValue(lang, selectedLanguages, setSelectedLanguages)}
          >
            {lang.toUpperCase()}
          </Chip>
        ))}
      </View>

      <SegmentedButtons
        style={{ marginTop: 12 }}
        value={sort}
        onValueChange={(value) => setSort(value as typeof sort)}
        buttons={[
          { value: 'recent', label: 'Recent', icon: 'clock-outline' },
          { value: 'relevance', label: 'Relevance', icon: 'star-outline' },
        ]}
      />

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
        <TextInput
          label="From"
          placeholder="YYYY-MM-DD"
          value={dateFrom}
          onChangeText={setDateFrom}
          style={{ flex: 1 }}
          accessibilityLabel="Filter from date"
        />
        <TextInput
          label="To"
          placeholder="YYYY-MM-DD"
          value={dateTo}
          onChangeText={setDateTo}
          style={{ flex: 1 }}
          accessibilityLabel="Filter to date"
        />
      </View>
      <HelperText type={showDateError ? 'error' : 'info'} visible>
        {showDateError
          ? 'End date must be after start date.'
          : 'Add an optional date range to refine results.'}
      </HelperText>

      <Button
        mode="contained-tonal"
        onPress={handleSubmit}
        style={{ marginTop: 8 }}
        disabled={!query}
        icon="magnify"
      >
        Search
      </Button>

      <Divider style={{ marginVertical: 12 }} />

      {recentSearches.length ? (
        <View style={{ marginBottom: 12 }}>
          <Text variant="titleSmall">Recent searches</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {recentSearches.map((item) => (
              <Chip key={item} onPress={() => setQuery(item)} icon="clock-outline">
                {item}
              </Chip>
            ))}
          </View>
        </View>
      ) : null}

      {search.loading && !search.results.length ? (
        <LoadingSkeletons />
      ) : hasNoResults ? (
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Text>No results for &quot;{query}&quot;. Try adjusting filters.</Text>
        </View>
      ) : null}
    </View>
  );

  const renderItem = ({ item }: { item: Article }) => (
    <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
      <NewsCard
        article={item}
        onPress={() =>
          router.push({ pathname: '/[article_id]', params: { article_id: item.id } })
        }
        onBookmark={() => toggleBookmark(item)}
        onShare={() => shareArticle(item)}
        isBookmarked={savedIds.includes(item.id)}
      />
    </View>
  );

  const renderEmpty = () => (
    <View style={{ padding: 24, alignItems: 'center' }}>
      <Text>Start searching to see articles</Text>
    </View>
  );

  const renderFooter = () =>
    search.loading && search.results.length ? (
      <View style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
        <ActivityIndicator accessibilityLabel="Loading more search results" />
      </View>
    ) : null;

  return (
    <FlatList
      data={search.results}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      onEndReachedThreshold={0.3}
      onEndReached={loadMoreResults}
      contentContainerStyle={{ flexGrow: 1 }}
      scrollEnabled={true}
      accessibilityLabel="Search results"
    />
  );
};

export default SearchScreen;
