import React from 'react';
import { View } from 'react-native';
import { Card, ActivityIndicator, useTheme } from 'react-native-paper';

const NewsCardSkeleton: React.FC = () => {
  const { colors } = useTheme();

  return (
    <Card style={{ marginBottom: 12, padding: 16 }} accessibilityHint="Loading article">
      <View style={{ height: 10, width: '60%', backgroundColor: colors.surfaceVariant, borderRadius: 8, marginBottom: 12 }} />
      <View style={{ height: 10, width: '80%', backgroundColor: colors.surfaceVariant, borderRadius: 8, marginBottom: 12 }} />
      <View style={{ height: 10, width: '90%', backgroundColor: colors.surfaceVariant, borderRadius: 8, marginBottom: 12 }} />
      <ActivityIndicator accessibilityLabel="Loading articles" />
    </Card>
  );
};

export default NewsCardSkeleton;
