import React from 'react';
import { Switch } from 'react-native-paper';

interface NotificationToggleProps {
  value: boolean;
  onToggle: (next: boolean) => void;
}

const NotificationToggle: React.FC<NotificationToggleProps> = ({ value, onToggle }) => (
  <Switch value={value} onValueChange={onToggle} />
);

export default NotificationToggle;
