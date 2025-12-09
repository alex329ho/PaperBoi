import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
});

export const scheduleDailyDigest = async (hour: number, minute: number) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'PaperBoi Daily Digest',
      body: 'Your curated news summary is ready.'
    },
    trigger: {
      hour,
      minute,
      repeats: true
    }
  });
};
