import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@utils/colors';
import { Spacing } from '@utils/spacing';
import { Typography } from '@utils/typography';

interface SummaryCardProps {
  title: string;
  summary: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, summary }) => (
  <View style={styles.card}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.summary}>{summary}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border
  },
  title: {
    fontSize: Typography.heading,
    color: Colors.text,
    fontWeight: '700'
  },
  summary: {
    fontSize: Typography.body,
    color: Colors.muted
  }
});

export default SummaryCard;
