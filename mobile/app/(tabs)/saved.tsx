import React, { useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Button, HelperText, Searchbar, SegmentedButtons, Text } from 'react-native-paper';
import NewsList from '../../components/news/NewsList';
import OfflineBanner from '../../components/common/OfflineBanner';
import { useNews } from '../../hooks/useNews';

const SavedScreen = () => {
  const router = useRouter();
  const { saved, toggleBookmark, shareArticle } = useNews();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');

  const filtered = useMemo(() => {
    const list = saved.filter((article) => article.title.toLowerCase().includes(query.toLowerCase()));
    return list.sort((a, b) => {
      const left = new Date(a.publishedAt ?? a.createdAt).getTime();
      const right = new Date(b.publishedAt ?? b.createdAt).getTime();
      return sort === 'newest' ? right - left : left - right;
    });
  }, [query, saved, sort]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <OfflineBanner />
      <View style={{ padding: 16 }}>
        <Searchbar
          placeholder="Search saved articles"
          value={query}
          onChangeText={setQuery}
          accessibilityLabel="Search saved articles"
        />
        <SegmentedButtons
          style={{ marginTop: 8 }}
          value={sort}
          onValueChange={(value) => setSort(value as typeof sort)}
          buttons={[
            { value: 'newest', label: 'Newest', icon: 'sort-clock-descending' },
            { value: 'oldest', label: 'Oldest', icon: 'sort-clock-ascending' },
          ]}
        />
      </View>
      <NewsList
        articles={filtered}
        onSelect={(article) => router.push({ pathname: '/[article_id]', params: { article_id: article.id } })}
        onBookmark={toggleBookmark}
        onShare={shareArticle}
        emptyLabel="No saved articles yet. Save stories to read offline."
        savedIds={saved.map((item) => item.id)}
      />
      {!filtered.length ? (
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Text>Saved articles are available offline for quick reading.</Text>
          <HelperText type="info" visible>
            Tap the bookmark icon on any story to keep it here. Swipe actions let you delete from saved quickly.
          </HelperText>
          <Button mode="contained-tonal" icon="compass" onPress={() => router.push('/(tabs)/home')}>
            Browse articles
          </Button>
        </View>
      ) : null}
    </SafeAreaView>
  );
};

export default SavedScreen;
