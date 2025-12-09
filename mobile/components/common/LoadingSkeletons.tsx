import React from 'react';
import { View } from 'react-native';
import { ActivityIndicator, useTheme } from 'react-native-paper';
import NewsCardSkeleton from '../news/NewsCardSkeleton';

const LoadingSkeletons: React.FC = () => {
  const { colors } = useTheme();
  return (
    <View style={{ padding: 16 }}>
      <NewsCardSkeleton />
      <NewsCardSkeleton />
      <View style={{ marginTop: 12, height: 10, width: '50%', backgroundColor: colors.surfaceVariant, borderRadius: 8 }} />
      <ActivityIndicator accessibilityLabel="Loading content" style={{ marginTop: 12 }} />
    </View>
  );
};

export default LoadingSkeletons;
