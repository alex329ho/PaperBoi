import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Chip, Divider, Searchbar, Text } from 'react-native-paper';
import NewsList from '../../components/news/NewsList';
import LoadingSkeletons from '../../components/common/LoadingSkeletons';
import { useNews } from '../../hooks/useNews';

const topics = ['Technology', 'Business', 'Health', 'Sports'];
const regions = ['US', 'Europe', 'Asia'];
const languages = ['en', 'es', 'fr'];

const SearchScreen = () => {
  const router = useRouter();
  const { search, executeSearch, loadMoreResults, saveRecent, toggleBookmark, saved, shareArticle } = useNews();
  const [query, setQuery] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (query.trim()) {
        executeSearch({ query, page: 1, filters: { topics: selectedTopics, regions: selectedRegions, languages: selectedLanguages } });
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [executeSearch, query, selectedLanguages, selectedRegions, selectedTopics]);

  const toggleValue = (value: string, list: string[], setter: (next: string[]) => void) => {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

  const handleSubmit = () => {
    if (!query) return;
    executeSearch({ query, page: 1, filters: { topics: selectedTopics, regions: selectedRegions, languages: selectedLanguages } });
    saveRecent([query, ...search.recent.filter((item) => item !== query)].slice(0, 10));
  };

  const hasNoResults = !search.loading && !search.results.length && query.length > 2;
  const savedIds = useMemo(() => saved.map((item) => item.id), [saved]);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Searchbar
        placeholder="Search articles"
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={handleSubmit}
        accessibilityLabel="Search articles"
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
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

      <Button mode="contained-tonal" onPress={handleSubmit} style={{ marginTop: 12 }} disabled={!query}>
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
    </View>
  );
};

export default SearchScreen;
