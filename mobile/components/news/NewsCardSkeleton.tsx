import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Spacing } from '@utils/spacing';
import { Colors } from '@utils/colors';

const NewsCardSkeleton: React.FC = () => (
  <View style={styles.card}>
    <View style={styles.image} />
    <View style={styles.line} />
    <View style={[styles.line, styles.short]} />
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm
  },
  image: {
    height: 120,
    backgroundColor: Colors.border,
    borderRadius: 8
  },
  line: {
    height: 14,
    backgroundColor: Colors.border,
    borderRadius: 6
  },
  short: {
    width: '60%'
  }
});

export default NewsCardSkeleton;
