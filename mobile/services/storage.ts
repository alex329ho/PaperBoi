import { NewsArticle } from '../types/api';
import cacheManager, { MAX_CACHE_BYTES } from '../utils/cacheManager';
import { NotificationHistoryEntry } from '../types/notifications';
import { getCacheSize, getItem, removeItem, setItem, StorageOptions } from '../utils/storage';

export interface SummaryCacheItem {
  id: string;
  articleId: string;
  summary: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  authToken: string;
}

export interface UserPreferences {
  notificationsEnabled: boolean;
  topics: string[];
  dailySummaryTime?: string;
  muteBreakingTopics?: string[];
}

export interface PendingAction {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
}

interface StoredArticles {
  items: NewsArticle[];
  lastUpdated: string;
}

interface StoredSummaries {
  items: SummaryCacheItem[];
  lastUpdated: string;
}

const STORAGE_KEYS = {
  user: '@paperboi_user',
  articles: '@paperboi_articles',
  summaries: '@paperboi_summaries',
  bookmarks: '@paperboi_bookmarks',
  preferences: '@paperboi_preferences',
  queue: '@paperboi_sync_queue',
  searchHistory: '@paperboi_search_history',
  theme: '@paperboi_theme',
  lastSync: '@paperboi_last_sync',
  notificationHistory: '@paperboi_notification_history',
};

const sevenDaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
};

const secureOptions: StorageOptions = { secure: true, encrypt: true };

export class StorageService {
  async saveArticles(articles: NewsArticle[]) {
    const cutoff = sevenDaysAgo();
    const filtered = articles.filter(
      (article) => !article.publishedAt || new Date(article.publishedAt) >= cutoff,
    );
    const payload: StoredArticles = {
      items: filtered,
      lastUpdated: new Date().toISOString(),
    };
    await setItem(STORAGE_KEYS.articles, payload);
    await cacheManager.enforceLimit([
      STORAGE_KEYS.summaries,
      STORAGE_KEYS.articles,
      STORAGE_KEYS.notificationHistory,
    ]);
    return payload.items;
  }

  async getArticles(): Promise<NewsArticle[]> {
    const cached = await getItem<StoredArticles>(STORAGE_KEYS.articles);
    return cached?.items ?? [];
  }

  async savePreferences(preferences: UserPreferences) {
    await setItem(STORAGE_KEYS.preferences, preferences, secureOptions);
    return preferences;
  }

  async getPreferences(): Promise<UserPreferences | null> {
    return getItem<UserPreferences>(STORAGE_KEYS.preferences, secureOptions);
  }

  async saveUser(user: UserProfile | null) {
    if (!user) return removeItem(STORAGE_KEYS.user, secureOptions);
    return setItem(STORAGE_KEYS.user, user, secureOptions);
  }

  async getUser(): Promise<UserProfile | null> {
    return getItem<UserProfile>(STORAGE_KEYS.user, secureOptions);
  }

  async saveSummaries(items: SummaryCacheItem[]) {
    const payload: StoredSummaries = { items, lastUpdated: new Date().toISOString() };
    await setItem(STORAGE_KEYS.summaries, payload);
    await cacheManager.enforceLimit([STORAGE_KEYS.summaries, STORAGE_KEYS.articles]);
    return payload.items;
  }

  async getSummaries(): Promise<SummaryCacheItem[]> {
    const cached = await getItem<StoredSummaries>(STORAGE_KEYS.summaries);
    return cached?.items ?? [];
  }

  async addBookmark(articleId: string) {
    const existing = (await this.getBookmarks()) ?? [];
    const unique = Array.from(new Set([...existing, articleId]));
    await setItem(STORAGE_KEYS.bookmarks, unique);
    return unique;
  }

  async removeBookmark(articleId: string) {
    const existing = (await this.getBookmarks()) ?? [];
    const filtered = existing.filter((id) => id !== articleId);
    await setItem(STORAGE_KEYS.bookmarks, filtered);
    return filtered;
  }

  async getBookmarks(): Promise<string[]> {
    const cached = await getItem<string[]>(STORAGE_KEYS.bookmarks);
    return cached ?? [];
  }

  async saveNotificationHistory(entries: NotificationHistoryEntry[]) {
    const trimmed = entries.slice(0, 100);
    await setItem(STORAGE_KEYS.notificationHistory, trimmed);
    await cacheManager.enforceLimit([
      STORAGE_KEYS.notificationHistory,
      STORAGE_KEYS.articles,
      STORAGE_KEYS.summaries,
    ]);
    return trimmed;
  }

  async getNotificationHistory(): Promise<NotificationHistoryEntry[]> {
    return (await getItem<NotificationHistoryEntry[]>(STORAGE_KEYS.notificationHistory)) ?? [];
  }

  async saveSearchHistory(history: string[]) {
    await setItem(STORAGE_KEYS.searchHistory, history.slice(-50));
    return history;
  }

  async getSearchHistory(): Promise<string[]> {
    const cached = await getItem<string[]>(STORAGE_KEYS.searchHistory);
    return cached ?? [];
  }

  async addPendingAction(action: PendingAction) {
    const queue = await this.getPendingActions();
    const nextQueue = [...queue, action];
    await setItem(STORAGE_KEYS.queue, nextQueue);
    return nextQueue;
  }

  async getPendingActions(): Promise<PendingAction[]> {
    const cached = await getItem<PendingAction[]>(STORAGE_KEYS.queue);
    return cached ?? [];
  }

  async clearPendingActions() {
    await removeItem(STORAGE_KEYS.queue);
  }

  async saveThemePreference(theme: 'light' | 'dark') {
    await setItem(STORAGE_KEYS.theme, theme);
    return theme;
  }

  async getThemePreference(): Promise<'light' | 'dark' | null> {
    return getItem<'light' | 'dark'>(STORAGE_KEYS.theme);
  }

  async clearOldData(olderThan: Date) {
    await cacheManager.clearOlderThan(STORAGE_KEYS.articles, olderThan);
    await cacheManager.clearOlderThan(STORAGE_KEYS.summaries, olderThan);
  }

  async clearCacheOnLogout() {
    await cacheManager.clearOnLogout([
      STORAGE_KEYS.articles,
      STORAGE_KEYS.summaries,
      STORAGE_KEYS.bookmarks,
      STORAGE_KEYS.preferences,
      STORAGE_KEYS.queue,
      STORAGE_KEYS.searchHistory,
      STORAGE_KEYS.theme,
      STORAGE_KEYS.lastSync,
      STORAGE_KEYS.notificationHistory,
    ]);
  }

  async addRecentSearch(term: string) {
    const history = await this.getSearchHistory();
    const filtered = [term, ...history.filter((item) => item !== term)].slice(0, 20);
    await setItem(STORAGE_KEYS.searchHistory, filtered);
    return filtered;
  }

  async saveLastSync(date: Date) {
    await setItem(STORAGE_KEYS.lastSync, date.toISOString());
    return date.toISOString();
  }

  async getLastSync(): Promise<string | null> {
    return getItem<string>(STORAGE_KEYS.lastSync);
  }

  async getCacheFootprint(): Promise<number> {
    return getCacheSize();
  }

  getCacheLimit() {
    return MAX_CACHE_BYTES;
  }
}

const storageService = new StorageService();
export default storageService;
