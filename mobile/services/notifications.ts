import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

export const configureNotifications = async () => {
  if (!Constants.isDevice) return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    throw new Error('Notification permissions not granted');
  }

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
};
