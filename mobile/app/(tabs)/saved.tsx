import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import NewsList from '../../components/news/NewsList';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { removeSavedArticle } from '../../store/slices/newsSlice';

const SavedScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const saved = useAppSelector((state) => state.news.saved);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <NewsList
        articles={saved}
        onSelect={(article) => router.push({ pathname: '/[article_id]', params: { article_id: article.id } })}
        onSave={(article) => dispatch(removeSavedArticle(article.id))}
      />
    </SafeAreaView>
  );
};

export default SavedScreen;
