import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import SummaryCard from '@components/summary/SummaryCard';
import SummaryDetail from '@components/summary/SummaryDetail';
import SummaryActions from '@components/summary/SummaryActions';
import { useAppSelector } from '@hooks/useRedux';

const ArticleScreen = () => {
  const { article_id } = useLocalSearchParams<{ article_id: string }>();
  const article = useAppSelector((state) =>
    state.news.articles.find((item) => item.id === article_id) ||
    state.news.saved.find((item) => item.id === article_id)
  );

  if (!article) return null;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: article.title }} />
      <SummaryCard title={article.title} summary={article.summary} />
      <SummaryDetail details={article.content} />
      <SummaryActions summary={article.summary} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 16
  }
});

export default ArticleScreen;
