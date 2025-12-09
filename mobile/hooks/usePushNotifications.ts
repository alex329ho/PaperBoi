import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { configureNotifications } from '../services/notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export const usePushNotifications = () => {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    configureNotifications()
      .then((value) => setToken(value ?? null))
      .catch(() => setToken(null));
  }, []);

  return token;
};
