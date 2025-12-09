import React, { useState } from 'react';
import { View } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import NewsList from '../../components/news/NewsList';
import { useApi } from '../../hooks/useApi';
import { Article } from '../../store/slices/newsSlice';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../services/endpoints';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const SearchScreen = () => {
  const [query, setQuery] = useState('');
  const router = useRouter();
  const { execute, data, loading } = useApi<Article[]>(async () => {
    const { data: response } = await api.get(API_ENDPOINTS.search, { params: { q: query } });
    return response.articles;
  });

  const results = data || [];

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <TextInput label="Search" value={query} onChangeText={setQuery} style={{ marginBottom: 12 }} />
      <Button mode="contained" onPress={() => execute()} disabled={!query} style={{ marginBottom: 12 }}>
        Search
      </Button>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <NewsList
          articles={results}
          onSelect={(article) => router.push({ pathname: '/[article_id]', params: { article_id: article.id } })}
          onSave={() => {}}
        />
      )}
    </View>
  );
};

export default SearchScreen;
