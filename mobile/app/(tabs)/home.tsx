import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Button, Chip, Text, useTheme } from 'react-native-paper';
import NewsList from '../../components/news/NewsList';
import LoadingSkeletons from '../../components/common/LoadingSkeletons';
import { useNews } from '../../hooks/useNews';

const HomeScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { feed, saved, loadMoreFeed, refreshFeed, offline, toggleBookmark, shareArticle } = useNews();

  const openArticle = (articleId: string) => router.push({ pathname: '/[article_id]', params: { article_id: articleId } });

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="titleLarge">PaperBoi</Text>
        <Button icon="cog" onPress={() => router.push('/(tabs)/settings')} accessibilityLabel="Open settings">
          Settings
        </Button>
      </View>
      <View style={{ paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Chip icon="tag" compact>
          Technology
        </Chip>
        <Chip icon="earth" compact>
          US
        </Chip>
        <Chip mode="outlined" onPress={() => router.push('/(tabs)/search')}>
          More
        </Chip>
      </View>
      {offline ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <Text style={{ color: colors.error }}>Offline mode: showing cached content.</Text>
        </View>
      ) : null}
      {feed.error ? (
        <View style={{ padding: 16 }}>
          <Text accessibilityRole="alert">{feed.error}</Text>
          <Button onPress={refreshFeed} mode="contained" style={{ marginTop: 8 }}>
            Retry
          </Button>
        </View>
      ) : null}
      {feed.loading && !feed.items.length ? (
        <LoadingSkeletons />
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
          savedIds={saved.map((item) => item.id)}
          emptyLabel="No articles yet. Pull to refresh to fetch the latest headlines."
        />
      )}
    </SafeAreaView>
  );
};

export default HomeScreen;
