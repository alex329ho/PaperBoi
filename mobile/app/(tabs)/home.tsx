import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Header from '@components/common/Header';
import NewsList from '@components/news/NewsList';
import { useAppSelector } from '@hooks/useRedux';

const HomeScreen = () => {
  const router = useRouter();
  const { articles, isLoading } = useAppSelector((state) => state.news);

  return (
    <View style={styles.container}>
      <Header title="Top Stories" subtitle="Curated by PaperBoi" />
      <NewsList
        articles={articles}
        loading={isLoading}
        onSelect={(article) => router.push(`/${article.id}`)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16
  }
});

export default HomeScreen;
