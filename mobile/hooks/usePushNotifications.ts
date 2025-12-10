import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import notificationService from '../services/notifications';
import { NotificationPayload } from '../types/notifications';

export const usePushNotifications = () => {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastNotification, setLastNotification] = useState<NotificationPayload | null>(null);

  useEffect(() => {
    let mounted = true;
    notificationService
      .initialize()
      .then((t) => {
        if (mounted) setToken(t);
      })
      .catch((err) => {
        console.warn('Notification setup failed', err);
        if (mounted) setError(String(err));
      });

    const foreground = Notifications.addNotificationReceivedListener((event) => {
      const payload: NotificationPayload = {
        title: event.request.content.title ?? '',
        body: event.request.content.body ?? '',
        data: (event.request.content.data as NotificationPayload['data']) ?? { type: 'reminder' },
      };
      setLastNotification(payload);
    });

    return () => {
      mounted = false;
      foreground.remove();
    };
  }, []);

  return { token, error, lastNotification };
};

export default usePushNotifications;
