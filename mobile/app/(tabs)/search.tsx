import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Header from '@components/common/Header';

const SearchScreen = () => {
  return (
    <View style={styles.container}>
      <Header title="Search" subtitle="Find topics you care about" />
      <Text>Search functionality coming soon.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 }
});

export default SearchScreen;
