import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@utils/colors';
import { Spacing } from '@utils/spacing';

const OfflineBanner: React.FC = () => (
  <View style={styles.container} testID="offline-banner">
    <Text style={styles.text}>You are offline. Some features may be unavailable.</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.danger,
    padding: Spacing.sm,
    alignItems: 'center'
  },
  text: {
    color: '#fff'
  }
});

export default OfflineBanner;
