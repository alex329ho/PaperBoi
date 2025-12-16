import AsyncStorage from '@react-native-async-storage/async-storage';
import storageService, { PendingAction } from '../services/storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const recentDate = () => new Date().toISOString();
const oldDate = () => new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

describe('StorageService', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('filters out articles older than 7 days', async () => {
    const articles = [
      { id: '1', title: 'New', summary: '', content: '', author: '', publishedAt: recentDate() },
      { id: '2', title: 'Old', summary: '', content: '', author: '', publishedAt: oldDate() },
    ];

    const saved = await storageService.saveArticles(articles as any);
    expect(saved).toHaveLength(1);
    const cached = await storageService.getArticles();
    expect(cached[0].id).toBe('1');
  });

  it('adds and removes bookmarks', async () => {
    await storageService.addBookmark('123');
    await storageService.addBookmark('456');

    expect(await storageService.getBookmarks()).toEqual(['123', '456']);

    await storageService.removeBookmark('123');
    expect(await storageService.getBookmarks()).toEqual(['456']);
  });

  it('queues and clears pending actions', async () => {
    const action: PendingAction = {
      id: 'a1',
      type: 'bookmark',
      payload: { id: '123' },
      timestamp: Date.now(),
    };

    await storageService.addPendingAction(action);
    const queued = await storageService.getPendingActions();
    expect(queued).toHaveLength(1);

    await storageService.clearPendingActions();
    expect(await storageService.getPendingActions()).toHaveLength(0);
  });
});
