import React from 'react';
import { View } from 'react-native';
import { ActivityIndicator, useTheme } from 'react-native-paper';
import NewsCardSkeleton from '../news/NewsCardSkeleton';

interface LoadingSkeletonsProps {
  /** How many article skeletons to display. */
  count?: number;
  /** Whether to also show a spinner at the end of the list. */
  showSpinner?: boolean;
}

const LoadingSkeletons: React.FC<LoadingSkeletonsProps> = ({ count = 2, showSpinner = true }) => {
  const { colors } = useTheme();
  return (
    <View style={{ padding: 16 }}>
      {Array.from({ length: count }).map((_, index) => (
        <NewsCardSkeleton key={index} />
      ))}
      <View
        style={{
          marginTop: 12,
          height: 10,
          width: '50%',
          backgroundColor: colors.surfaceVariant,
          borderRadius: 8,
        }}
      />
      {showSpinner ? <ActivityIndicator accessibilityLabel="Loading content" style={{ marginTop: 12 }} /> : null}
    </View>
  );
};

export default LoadingSkeletons;
