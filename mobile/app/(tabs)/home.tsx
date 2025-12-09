import React, { useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import NewsList from '../../components/news/NewsList';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { loadTopStories, saveArticle } from '../../store/slices/newsSlice';

const HomeScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { articles, loading } = useAppSelector((state) => state.news);

  useEffect(() => {
    dispatch(loadTopStories());
  }, [dispatch]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <NewsList
          articles={articles}
          loading={loading}
          onSelect={(article) => router.push({ pathname: '/[article_id]', params: { article_id: article.id } })}
          onSave={(article) => dispatch(saveArticle(article))}
        />
      )}
    </SafeAreaView>
  );
};

export default HomeScreen;
