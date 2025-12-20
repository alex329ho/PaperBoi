import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { getMessaging, getToken, Messaging, onMessage, onTokenRefresh } from 'firebase/messaging';
import {
  NotificationHistoryEntry,
  NotificationPayload,
  NotificationPreferences,
} from '../types/notifications';
import storageService from './storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const DEFAULT_CHANNEL_ID = 'paperboi-default';
const BACKEND_TOKEN_ENDPOINT = '/preferences/device-token';

const getFirebaseConfig = () => {
  const extra =
    Constants.expoConfig?.extra ||
    (Constants as unknown as { manifest?: { extra?: Record<string, any> } }).manifest?.extra ||
    {};
  if (Platform.OS === 'ios' && extra.firebaseIos) {
    return extra.firebaseIos;
  }
  if (extra.firebase) {
    return extra.firebase;
  }
  return {
    apiKey: extra.firebaseApiKey,
    authDomain: extra.firebaseAuthDomain,
    projectId: extra.firebaseProjectId,
    storageBucket: extra.firebaseStorageBucket,
    messagingSenderId: extra.firebaseSenderId,
    appId: extra.firebaseAppId,
    measurementId: extra.firebaseMeasurementId,
  };
};

class NotificationService {
  private app?: FirebaseApp;
  private messaging?: Messaging;
  private history: NotificationHistoryEntry[] = [];
  private listenersRegistered = false;

  private generateId() {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `notification-${Date.now()}-${Math.random()}`;
  }

  private async hydrateHistory() {
    try {
      this.history = await storageService.getNotificationHistory();
    } catch (error) {
      console.warn('Failed to hydrate notification history', error);
      this.history = [];
    }
  }

  async initialize() {
    this.bootstrapFirebase();
    await this.requestPermissions();
    await this.ensureNotificationChannel();
    await this.hydrateHistory();
    await this.registerListeners();
    return this.getToken();
  }

  private bootstrapFirebase() {
    const config = getFirebaseConfig();
    if (!config) {
      console.warn('Firebase config missing in app config');
      return;
    }
    if (!this.app) {
      this.app = getApps().length ? getApps()[0] : initializeApp(config);
    }
    if (!this.messaging && this.app) {
      try {
        this.messaging = getMessaging(this.app);
      } catch (error) {
        console.warn('Messaging initialization failed', error);
      }
    }
  }

  async requestPermissions() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      throw new Error('Notification permissions not granted');
    }
    return finalStatus;
  }

  async ensureNotificationChannel() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
        name: 'PaperBoi Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        description: 'News alerts, daily summaries, and reminders',
      });
    }
  }

  async getToken() {
    if (!this.messaging) return null;
    const token = await getToken(this.messaging, {
      vapidKey: Constants.expoConfig?.extra?.fcmVapidKey,
    });
    if (token) {
      await this.sendTokenToBackend(token);
    }
    return token;
  }

  async handleNotification(payload: NotificationPayload) {
    const preferences = await storageService.getPreferences();
    if (preferences && !preferences.notificationsEnabled) return null;

    if (preferences?.muteBreakingTopics?.length && payload.data.topic) {
      if (preferences.muteBreakingTopics.includes(payload.data.topic)) {
        return null;
      }
    }

    const entry: NotificationHistoryEntry = {
      id: this.generateId(),
      payload,
      receivedAt: new Date().toISOString(),
    };
    this.history = [entry, ...this.history].slice(0, 50);
    await storageService.saveNotificationHistory(this.history);
    return entry;
  }

  async scheduleLocalNotification(time: Date, title: string, body: string) {
    return Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: time,
    });
  }

  async subscribeToTopic(topic: string) {
    const token = await this.getToken();
    if (!token) return null;
    try {
      await fetch(`${BACKEND_TOKEN_ENDPOINT}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, topic }),
      });
      return true;
    } catch (error) {
      console.warn('Failed to subscribe to topic', error);
      return false;
    }
  }

  async unsubscribeFromTopic(topic: string) {
    const token = await this.getToken();
    if (!token) return null;
    try {
      await fetch(`${BACKEND_TOKEN_ENDPOINT}/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, topic }),
      });
      return true;
    } catch (error) {
      console.warn('Failed to unsubscribe from topic', error);
      return false;
    }
  }

  async registerListeners() {
    if (this.listenersRegistered) return;
    this.listenersRegistered = true;

    Notifications.addNotificationReceivedListener(async (notification) => {
      const content = notification.request.content;
      const payload: NotificationPayload = {
        title: content.title ?? '',
        body: content.body ?? '',
        data: (content.data as NotificationPayload['data']) ?? { type: 'reminder' },
      };
      await this.handleNotification(payload);
    });

    Notifications.addNotificationResponseReceivedListener(async (response) => {
      const data = response.notification.request.content.data as NotificationPayload['data'];
      await this.handleNotification({
        title: response.notification.request.content.title ?? '',
        body: response.notification.request.content.body ?? '',
        data,
      });
      // Deep link navigation would occur here based on data
    });

    if (this.messaging) {
      onMessage(this.messaging, async (message) => {
        const payload: NotificationPayload = {
          title: message.notification?.title ?? 'PaperBoi',
          body: message.notification?.body ?? '',
          data: (message.data as NotificationPayload['data']) ?? { type: 'reminder' },
        };
        await this.handleNotification(payload);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: payload.title,
            body: payload.body,
            data: payload.data,
          },
          trigger: null,
        });
      });

      onTokenRefresh(this.messaging, async (newToken) => {
        await this.sendTokenToBackend(newToken);
      });
    }
  }

  async applyPreferences(preferences: NotificationPreferences) {
    await storageService.savePreferences({
      notificationsEnabled: preferences.enabled,
      topics: preferences.topics ?? [],
      dailySummaryTime: preferences.dailySummaryTime,
      muteBreakingTopics: preferences.muteTopics ?? [],
    });
    if (preferences.dailySummaryTime) {
      const [hours, minutes] = preferences.dailySummaryTime.split(':').map(Number);
      const now = new Date();
      const trigger = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
      if (trigger < now) trigger.setDate(trigger.getDate() + 1);
      await this.scheduleLocalNotification(
        trigger,
        'Your Daily News Summary',
        '5 new articles in Technology',
      );
    }
    return preferences;
  }

  getHistory() {
    return this.history;
  }

  private async sendTokenToBackend(token: string) {
    try {
      await fetch(BACKEND_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
    } catch (error) {
      console.warn('Failed to register device token', error);
    }
  }
}

const notificationService = new NotificationService();
export default notificationService;
