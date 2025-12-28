import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';

const NewsCardSkeleton: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.outline },
      ]}
      accessibilityHint="Loading article"
    >
      <View style={[styles.image, { backgroundColor: colors.surfaceVariant }]} />
      <View style={styles.content}>
        <View style={[styles.line, styles.titleLine, { backgroundColor: colors.surfaceVariant }]} />
        <View style={[styles.line, styles.bodyLine, { backgroundColor: colors.surfaceVariant }]} />
        <View style={[styles.line, styles.bodyLine, { backgroundColor: colors.surfaceVariant }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  image: {
    height: 180,
  },
  content: {
    padding: 16,
    gap: 10,
  },
  line: {
    borderRadius: 8,
    height: 10,
  },
  titleLine: {
    width: '70%',
  },
  bodyLine: {
    width: '90%',
  },
});

export default NewsCardSkeleton;
