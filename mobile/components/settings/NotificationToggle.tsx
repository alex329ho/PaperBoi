import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Colors } from '@utils/colors';
import { Spacing } from '@utils/spacing';

interface NotificationToggleProps {
  value: boolean;
  onToggle: (value: boolean) => void;
}

const NotificationToggle: React.FC<NotificationToggleProps> = ({ value, onToggle }) => (
  <View style={styles.container}>
    <Text style={styles.text}>Notifications</Text>
    <Switch value={value} onValueChange={onToggle} trackColor={{ true: Colors.primary }} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm
  },
  text: {
    color: Colors.text
  }
});

export default NotificationToggle;
