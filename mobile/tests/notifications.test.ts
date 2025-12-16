import notificationService from '../services/notifications';
import storageService from '../services/storage';
import * as Notifications from 'expo-notifications';

jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      firebase: { apiKey: 'key', projectId: 'project' },
      fcmVapidKey: 'vapid',
    },
  },
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  scheduleNotificationAsync: jest.fn(),
  AndroidImportance: { HIGH: 5 },
}));

jest.mock('firebase/app', () => ({
  getApps: jest.fn(() => []),
  initializeApp: jest.fn(() => ({})),
}));

jest.mock('firebase/messaging', () => ({
  getMessaging: jest.fn(() => ({})),
  getToken: jest.fn().mockResolvedValue('mock-token'),
  onMessage: jest.fn(),
  onTokenRefresh: jest.fn(),
}));

jest.mock('../services/storage', () => ({
  __esModule: true,
  default: {
    getPreferences: jest.fn(),
    savePreferences: jest.fn(),
    saveNotificationHistory: jest.fn(),
    getNotificationHistory: jest.fn().mockResolvedValue([]),
  },
}));

global.fetch = jest.fn().mockResolvedValue({ ok: true });

const mockedStorage = storageService as jest.Mocked<typeof storageService>;

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedStorage.getPreferences = jest.fn().mockResolvedValue({ notificationsEnabled: true });
    mockedStorage.savePreferences = jest
      .fn()
      .mockResolvedValue({ notificationsEnabled: true, topics: [] });
  });

  it('initializes and fetches token', async () => {
    const token = await notificationService.initialize();
    expect(token).toBe('mock-token');
    expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
  });

  it('ignores muted breaking topics', async () => {
    mockedStorage.getPreferences = jest.fn().mockResolvedValue({
      notificationsEnabled: true,
      muteBreakingTopics: ['finance'],
    });

    const entry = await notificationService.handleNotification({
      title: 'Breaking',
      body: 'Finance',
      data: { type: 'breaking_news', topic: 'finance' },
    });

    expect(entry).toBeNull();
  });

  it('applies preferences and schedules summary', async () => {
    const now = new Date();
    const hourString = `${now.getHours()}:${now.getMinutes()}`;
    await notificationService.applyPreferences({
      enabled: true,
      topics: [],
      dailySummaryTime: hourString,
    });
    expect(mockedStorage.savePreferences).toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
  });

  it('persists notification history when handling a payload', async () => {
    await notificationService.handleNotification({
      title: 'Ping',
      body: 'Hello',
      data: { type: 'reminder' },
    });

    expect(mockedStorage.saveNotificationHistory).toHaveBeenCalled();
  });
});
