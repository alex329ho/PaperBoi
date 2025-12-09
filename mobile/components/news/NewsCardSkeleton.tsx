import React from 'react';
import { Card, ActivityIndicator } from 'react-native-paper';

const NewsCardSkeleton: React.FC = () => (
  <Card style={{ marginBottom: 12, padding: 16 }}>
    <ActivityIndicator />
  </Card>
);

export default NewsCardSkeleton;
