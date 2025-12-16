import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
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
import NewsList from '../../components/news/NewsList';
import LoadingSkeletons from '../../components/common/LoadingSkeletons';
import { useNews } from '../../hooks/useNews';

const topics = ['Technology', 'Business', 'Health', 'Sports', 'Science'];
const regions = ['US', 'Europe', 'Asia', 'Africa', 'Global'];
const languages = ['en', 'es', 'fr', 'de'];

const SearchScreen = () => {
  const router = useRouter();
  const { search, executeSearch, loadMoreResults, saveRecent, toggleBookmark, saved, shareArticle } = useNews();
  const [query, setQuery] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [sort, setSort] = useState<'recent' | 'relevance'>('recent');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      if (query.trim().length > 2) {
        executeSearch({
          query,
          page: 1,
          filter: { topics: selectedTopics, regions: selectedRegions, languages: selectedLanguages, sortBy: sort },
        });
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [executeSearch, query, selectedLanguages, selectedRegions, selectedTopics, sort]);

  const toggleValue = (value: string, list: string[], setter: (next: string[]) => void) => {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

  const handleSubmit = () => {
    if (!query.trim()) return;
    executeSearch({
      query,
      page: 1,
      filter: {
        topics: selectedTopics,
        regions: selectedRegions,
        languages: selectedLanguages,
        sortBy: sort,
      },
    });
    saveRecent([query, ...search.recent.filter((item) => item !== query)].slice(0, 10));
  };

  const hasNoResults = !search.loading && !search.results.length && query.length > 2;
  const savedIds = useMemo(() => saved.map((item) => item.id), [saved]);
  const showDateError = Boolean(dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo));

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ flex: 1, padding: 16 }}>
        <Searchbar
          placeholder="Search articles"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSubmit}
          accessibilityLabel="Search articles"
        />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {topics.map((topic) => (
            <Chip key={topic} selected={selectedTopics.includes(topic)} onPress={() => toggleValue(topic, selectedTopics, setSelectedTopics)}>
              {topic}
            </Chip>
          ))}
          {regions.map((region) => (
            <Chip key={region} selected={selectedRegions.includes(region)} onPress={() => toggleValue(region, selectedRegions, setSelectedRegions)}>
              {region}
            </Chip>
          ))}
          {languages.map((lang) => (
            <Chip key={lang} selected={selectedLanguages.includes(lang)} onPress={() => toggleValue(lang, selectedLanguages, setSelectedLanguages)}>
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
          {showDateError ? 'End date must be after start date.' : 'Add an optional date range to refine results.'}
        </HelperText>

        <Button mode="contained-tonal" onPress={handleSubmit} style={{ marginTop: 8 }} disabled={!query} icon="magnify">
          Search
        </Button>

        <Divider style={{ marginVertical: 12 }} />

        {search.recent.length ? (
          <View style={{ marginBottom: 12 }}>
            <Text variant="titleSmall">Recent searches</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {search.recent.map((item) => (
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
            <Text>No results for “{query}”. Try adjusting filters.</Text>
          </View>
        ) : (
          <NewsList
            articles={search.results}
            loading={search.loading}
            onSelect={(article) => router.push({ pathname: '/[article_id]', params: { article_id: article.id } })}
            onBookmark={toggleBookmark}
            onShare={shareArticle}
            loadMore={loadMoreResults}
            hasNextPage={search.hasNextPage}
            emptyLabel="Start searching to see articles"
            savedIds={savedIds}
          />
        )}

        {search.loading && search.results.length ? (
          <View style={{ paddingVertical: 12 }}>
            <ActivityIndicator accessibilityLabel="Loading more search results" />
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
};

export default SearchScreen;
