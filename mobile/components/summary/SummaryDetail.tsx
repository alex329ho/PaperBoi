import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Spacing } from '@utils/spacing';
import { Typography } from '@utils/typography';
import { Colors } from '@utils/colors';

interface SummaryDetailProps {
  details: string;
}

const SummaryDetail: React.FC<SummaryDetailProps> = ({ details }) => (
  <ScrollView style={styles.container}>
    <Text style={styles.text}>{details}</Text>
  </ScrollView>
);

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md
  },
  text: {
    fontSize: Typography.body,
    color: Colors.text,
    lineHeight: 22
  }
});

export default SummaryDetail;
