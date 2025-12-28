import React from 'react';
import { View } from 'react-native';
import LoadingAnimation from './LoadingAnimation';

const LoadingSpinner: React.FC = () => (
  <View style={{ padding: 16, alignItems: 'center', justifyContent: 'center' }}>
    <LoadingAnimation size={120} accessibilityLabel="Loading content" />
  </View>
);

export default LoadingSpinner;
