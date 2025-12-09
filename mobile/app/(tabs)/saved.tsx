import React from 'react';
import { StyleSheet, View } from 'react-native';
import Header from '@components/common/Header';
import NewsList from '@components/news/NewsList';
import { useAppSelector } from '@hooks/useRedux';

const SavedScreen = () => {
  const saved = useAppSelector((state) => state.news.saved);

  return (
    <View style={styles.container}>
      <Header title="Saved" subtitle="Your bookmarked articles" />
      <NewsList articles={saved} onSelect={() => {}} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 }
});

export default SavedScreen;
