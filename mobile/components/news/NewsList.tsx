import React from 'react';
import { FlatList } from 'react-native';
import NewsCard from './NewsCard';
import NewsCardSkeleton from './NewsCardSkeleton';
import { Article } from '../../store/slices/newsSlice';

interface NewsListProps {
  articles: Article[];
  loading?: boolean;
  onSelect: (article: Article) => void;
  onSave: (article: Article) => void;
}

const NewsList: React.FC<NewsListProps> = ({ articles, loading = false, onSelect, onSave }) => (
  <FlatList
    data={articles}
    keyExtractor={(item) => item.id}
    renderItem={({ item }) => <NewsCard article={item} onPress={() => onSelect(item)} onSave={() => onSave(item)} />}
    ListEmptyComponent={loading ? <NewsCardSkeleton /> : null}
    contentContainerStyle={{ padding: 16 }}
  />
);

export default NewsList;
