import React from 'react';
import { Card, Text } from 'react-native-paper';

interface SummaryCardProps {
  title: string;
  summary: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, summary }) => (
  <Card style={{ marginBottom: 12 }}>
    <Card.Title title={title} />
    <Card.Content>
      <Text>{summary}</Text>
    </Card.Content>
  </Card>
);

export default SummaryCard;
