import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Colors } from '@utils/colors';

const LoadingSpinner: React.FC = () => (
  <View style={styles.container}>
    <ActivityIndicator color={Colors.primary} size="large" />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  }
});

export default LoadingSpinner;
