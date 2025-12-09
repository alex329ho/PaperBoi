import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';

export const usePushNotifications = () => {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const configure = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Notifications Disabled', 'Enable notifications to receive updates.');
        return;
      }

      const expoToken = await Notifications.getExpoPushTokenAsync();
      setToken(expoToken.data);

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX
        });
      }
    };

    configure();
  }, []);

  return { token };
};
