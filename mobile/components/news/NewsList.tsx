import React from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import NewsCard from './NewsCard';
import NewsCardSkeleton from './NewsCardSkeleton';
import { Article } from '../../store/slices/newsSlice';

interface NewsListProps {
  articles: Article[];
  loading?: boolean;
  refreshing?: boolean;
  onSelect: (article: Article) => void;
  onBookmark: (article: Article) => void;
  onShare: (article: Article) => void;
  loadMore?: () => void;
  hasNextPage?: boolean;
  onRefresh?: () => void;
  emptyLabel?: string;
  savedIds?: string[];
}

const NewsList: React.FC<NewsListProps> = ({
  articles,
  loading = false,
  refreshing = false,
  onSelect,
  onBookmark,
  onShare,
  loadMore,
  hasNextPage,
  onRefresh,
  emptyLabel,
  savedIds = [],
}) => (
  <FlatList
    data={articles}
    keyExtractor={(item) => item.id}
    renderItem={({ item }) => (
      <NewsCard
        article={item}
        onPress={() => onSelect(item)}
        onBookmark={() => onBookmark(item)}
        onShare={() => onShare(item)}
        isBookmarked={savedIds.includes(item.id)}
      />
    )}
    ListEmptyComponent={
      loading ? (
        <View style={{ padding: 16 }}>
          <NewsCardSkeleton />
          <NewsCardSkeleton />
        </View>
      ) : (
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Text>{emptyLabel || 'No articles available'}</Text>
        </View>
      )
    }
    ListFooterComponent={
      hasNextPage && loadMore ? (
        <View style={{ paddingVertical: 16 }}>
          <ActivityIndicator />
        </View>
      ) : null
    }
    refreshControl={
      onRefresh ? (
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="gray" />
      ) : undefined
    }
    onEndReachedThreshold={0.3}
    onEndReached={loadMore}
    contentContainerStyle={{ padding: 16 }}
    accessibilityLabel="News feed list"
  />
);

export default NewsList;
