import React from 'react';
import { Snackbar } from 'react-native-paper';

interface ToastProps {
  visible: boolean;
  message: string;
  onDismiss: () => void;
}

const ToastNotification: React.FC<ToastProps> = ({ visible, message, onDismiss }) => (
  <Snackbar visible={visible} onDismiss={onDismiss} duration={3000}>
    {message}
  </Snackbar>
);

export default ToastNotification;
