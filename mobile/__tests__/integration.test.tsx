import { combineReducers, configureStore } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import syncMiddleware from '../store/middleware/syncMiddleware';
import authReducer from '../store/slices/authSlice';
import newsReducer from '../store/slices/newsSlice';
import preferencesReducer from '../store/slices/preferencesSlice';
import syncReducer from '../store/slices/syncSlice';
import uiReducer, { setNetwork } from '../store/slices/uiSlice';
import { loginUser, registerUser } from '../store/thunks/authThunks';
import { fetchNews, generateSummary } from '../store/thunks/newsThunks';
import { updatePreferences } from '../store/thunks/preferencesThunks';
import { RootState } from '../store/types';
import apiClient from '../services/api';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type TestStore = ReturnType<typeof buildStore>;
const mockApi = apiClient as jest.Mocked<typeof apiClient>;

const buildStore = () =>
  configureStore({
    reducer: combineReducers({
      auth: authReducer,
      news: newsReducer,
      preferences: preferencesReducer,
      ui: uiReducer,
      sync: syncReducer,
    }),
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false, thunk: true }).prepend(syncMiddleware),
  });

const respond = (data: any, status = 200) =>
  Promise.resolve({
    data,
    status,
  });

beforeEach(async () => {
  mockApi.get.mockReset();
  mockApi.post.mockReset();
  mockApi.put.mockReset();
  await AsyncStorage.clear();
});

describe('Backend-mobile integration flows', () => {
  it('registers, logs in, syncs preferences, and fetches news with summaries', async () => {
    const store = buildStore();
    store.dispatch(setNetwork('online'));

    const user = { id: 'u-1', email: 'integration@example.com', name: 'Integration User' };
    const preferencesResponse = {
      ...store.getState().preferences,
      topics: ['ai', 'finance'],
      regions: ['US'],
      languages: ['en'],
      summaryLength: 'SHORT' as const,
      emailFrequency: 'daily' as const,
    };
    const article = {
      id: 'n-1',
      title: 'AI transforms markets',
      content: 'Short body',
      topic: 'ai',
      region: 'US',
      language: 'en',
      source: 'MockWire',
      createdAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
    };

    mockApi.post.mockImplementation((url: string) => {
      if (url.includes('/auth/register') || url.includes('/auth/login')) {
        return respond({ data: { user, token: 'token-123' } });
      }
      if (url.includes('/summarize')) {
        return respond({ data: { summary: 'This is a generated summary.' } });
      }
      return respond({});
    });
    mockApi.put.mockImplementation((url: string) => {
      if (url.includes('/preferences')) {
        return respond({ data: preferencesResponse });
      }
      return respond({});
    });
    mockApi.get.mockImplementation((url: string) => {
      if (url.includes('/preferences')) {
        return respond({ data: preferencesResponse });
      }
      if (url.includes('/news')) {
        return respond({
          data: [article],
          pagination: { total: 1, limit: 5, offset: 0 },
        });
      }
      return respond({});
    });

    await store.dispatch(registerUser({ email: user.email, password: 'Pass1234!', name: user.name }) as any);
    await store.dispatch(loginUser({ email: user.email, password: 'Pass1234!' }) as any);
    expect(store.getState().auth.isAuthenticated).toBe(true);

    await store.dispatch(
      updatePreferences({
        topics: ['ai', 'finance'],
        regions: ['US'],
        languages: ['en'],
        notificationTime: '07:30',
        summaryLength: 'SHORT',
        emailFrequency: 'daily',
        notificationEnabled: true,
      }) as any,
    );
    expect(store.getState().preferences.topics).toContain('ai');
    expect(store.getState().preferences.summaryLength).toBe('SHORT');

    await store.dispatch(
      fetchNews({
        filter: { topics: ['ai'], regions: ['US'], languages: ['en'], sortBy: 'recent' },
        page: 1,
        limit: 5,
      }) as any,
    );
    expect(store.getState().news.articles).toHaveLength(1);

    await store.dispatch(generateSummary({ articleId: article.id, length: 'SHORT' }) as any);
    expect(store.getState().news.summaries[article.id]).toContain('summary');
  });

  it('queues actions while offline and replays them once online', async () => {
    const store = buildStore();
    const preferencesResponse = {
      ...store.getState().preferences,
      topics: ['queued'],
      regions: ['CA'],
      languages: ['en'],
    };
    const article = {
      id: 'n-2',
      title: 'Cached story',
      content: 'Cached content',
      topic: 'general',
      region: 'CA',
      language: 'en',
      createdAt: new Date().toISOString(),
    };

    mockApi.put.mockImplementation((url: string) => {
      if (url.includes('/preferences')) {
        return respond({ data: preferencesResponse });
      }
      return respond({});
    });
    mockApi.get.mockImplementation((url: string) => {
      if (url.includes('/news')) {
        return respond({
          data: [article],
          pagination: { total: 1, limit: 5, offset: 0 },
        });
      }
      return respond({});
    });

    store.dispatch(setNetwork('offline'));
    await store.dispatch(
      updatePreferences({ topics: ['queued'], regions: ['CA'], languages: ['en'] }) as any,
    );
    await store.dispatch(
      fetchNews({ filter: { topics: ['queued'], regions: ['CA'], languages: ['en'], sortBy: 'recent' } }) as any,
    );

    expect(store.getState().sync.pendingActions.length).toBeGreaterThanOrEqual(2);
    expect(mockApi.get).not.toHaveBeenCalled();

    store.dispatch(setNetwork('online'));
    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(store.getState().sync.pendingActions.length).toBe(0);
    expect(mockApi.put).toHaveBeenCalledWith(
      expect.stringContaining('/preferences'),
      expect.objectContaining({ topics: ['queued'], regions: ['CA'], languages: ['en'] }),
    );
    expect(store.getState().news.articles).toHaveLength(1);
  });
});

export type AppDispatch = TestStore['dispatch'];
export type AppState = RootState;
