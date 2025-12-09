import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Spacing } from '@utils/spacing';
import { Typography } from '@utils/typography';
import { Colors } from '@utils/colors';

interface PreferenceSectionProps {
  title: string;
  children: React.ReactNode;
}

const PreferenceSection: React.FC<PreferenceSectionProps> = ({ title, children }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
    gap: Spacing.sm
  },
  title: {
    fontSize: Typography.subheading,
    color: Colors.text,
    fontWeight: '700'
  }
});

export default PreferenceSection;
