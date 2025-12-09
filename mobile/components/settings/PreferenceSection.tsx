import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';

interface PreferenceSectionProps {
  title: string;
  children?: React.ReactNode;
}

const PreferenceSection: React.FC<PreferenceSectionProps> = ({ title, children }) => (
  <View style={{ marginBottom: 16 }}>
    <Text variant="titleMedium" style={{ marginBottom: 8 }}>
      {title}
    </Text>
    {children}
  </View>
);

export default PreferenceSection;
