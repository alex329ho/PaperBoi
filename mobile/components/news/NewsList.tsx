import React from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
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
}) => {
  const { colors } = useTheme();

  return (
    <FlatList
      data={articles}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => (
        <NewsCard
          article={item}
          onPress={() => onSelect(item)}
          onBookmark={() => onBookmark(item)}
          onShare={() => onShare(item)}
          isBookmarked={savedIds.includes(item.id)}
          variant={index === 0 ? 'featured' : 'standard'}
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.onSurfaceVariant}
          />
        ) : undefined
      }
      onEndReachedThreshold={0.3}
      onEndReached={loadMore}
      contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
      accessibilityLabel="News feed list"
    />
  );
};

export default NewsList;
