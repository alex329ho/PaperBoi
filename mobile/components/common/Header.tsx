import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Typography } from '@utils/typography';
import { Colors } from '@utils/colors';
import { Spacing } from '@utils/spacing';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md
  },
  title: {
    fontSize: Typography.heading,
    color: Colors.text,
    fontWeight: 'bold'
  },
  subtitle: {
    marginTop: Spacing.xs,
    color: Colors.muted,
    fontSize: Typography.body
  }
});

export default Header;
