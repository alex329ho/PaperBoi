import React, { useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Button, Searchbar, Text } from 'react-native-paper';
import NewsList from '../../components/news/NewsList';
import { useNews } from '../../hooks/useNews';

const SavedScreen = () => {
  const router = useRouter();
  const { saved, toggleBookmark, shareArticle } = useNews();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');

  const filtered = useMemo(() => {
    const list = saved.filter((article) => article.title.toLowerCase().includes(query.toLowerCase()));
    return list.sort((a, b) =>
      sort === 'newest'
        ? new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        : new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
    );
  }, [query, saved, sort]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ padding: 16 }}>
        <Searchbar
          placeholder="Search saved articles"
          value={query}
          onChangeText={setQuery}
          accessibilityLabel="Search saved articles"
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <Button mode={sort === 'newest' ? 'contained' : 'text'} onPress={() => setSort('newest')}>
            Newest
          </Button>
          <Button mode={sort === 'oldest' ? 'contained' : 'text'} onPress={() => setSort('oldest')}>
            Oldest
          </Button>
        </View>
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
        </View>
      ) : null}
    </SafeAreaView>
  );
};

export default SavedScreen;
