import React from 'react';
import { ScrollView } from 'react-native';
import { Text } from 'react-native-paper';

interface SummaryDetailProps {
  content: string;
}

const SummaryDetail: React.FC<SummaryDetailProps> = ({ content }) => (
  <ScrollView style={{ padding: 16 }}>
    <Text variant="bodyLarge">{content}</Text>
  </ScrollView>
);

export default SummaryDetail;
