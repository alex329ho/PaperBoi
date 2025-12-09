import React from 'react';
import { ActivityIndicator } from 'react-native-paper';
import { View } from 'react-native';

const LoadingSpinner: React.FC = () => (
  <View style={{ padding: 16, alignItems: 'center', justifyContent: 'center' }}>
    <ActivityIndicator size="large" />
  </View>
);

export default LoadingSpinner;
