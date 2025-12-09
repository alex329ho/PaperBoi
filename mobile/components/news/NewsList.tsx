import React from 'react';
import { FlatList, View } from 'react-native';
import NewsCard from './NewsCard';
import NewsCardSkeleton from './NewsCardSkeleton';
import { Article } from '@store/slices/newsSlice';

interface NewsListProps {
  articles: Article[];
  loading?: boolean;
  onSelect: (article: Article) => void;
}

const NewsList: React.FC<NewsListProps> = ({ articles, loading, onSelect }) => {
  if (loading) {
    return (
      <View>
        {Array.from({ length: 4 }).map((_, index) => (
          <NewsCardSkeleton key={index} />
        ))}
      </View>
    );
  }

  return (
    <FlatList
      data={articles}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <NewsCard article={item} onPress={() => onSelect(item)} />}
    />
  );
};

export default NewsList;
