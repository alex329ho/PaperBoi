import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCacheSize } from './storage';

// Centralized cache lifecycle manager responsible for enforcing the 50MB
// storage budget, trimming stale records, and cleaning up sensitive data on
// logout. All services should go through this helper rather than directly
// calling AsyncStorage when performing cache maintenance so policies stay
// consistent across the app.

export const MAX_CACHE_BYTES = 50 * 1024 * 1024; // 50MB

export interface CacheCleanupResult {
  reclaimedBytes: number;
  removedKeys: string[];
}

const isAfter = (value: string | undefined, date: Date) => {
  if (!value) return true;
  return new Date(value).getTime() >= date.getTime();
};

export class CacheManager {
  constructor(private readonly maxBytes = MAX_CACHE_BYTES) {}

  async enforceLimit(priorityKeys?: string[]): Promise<CacheCleanupResult> {
    const total = await getCacheSize();
    if (total <= this.maxBytes) return { reclaimedBytes: 0, removedKeys: [] };

    const keys = priorityKeys ?? (await AsyncStorage.getAllKeys());
    const removedKeys: string[] = [];
    let reclaimedBytes = 0;

    for (const key of keys) {
      if (reclaimedBytes >= total - this.maxBytes) break;
      const value = await AsyncStorage.getItem(key);
      if (!value) continue;
      await AsyncStorage.removeItem(key);
      removedKeys.push(key);
      reclaimedBytes += value.length;
    }

    return { reclaimedBytes, removedKeys };
  }

  async clearOlderThan(key: string, date: Date) {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { items?: { publishedAt?: string }[] };
      const filtered = parsed.items?.filter((item) => isAfter(item.publishedAt, date)) ?? [];
      await AsyncStorage.setItem(key, JSON.stringify({ ...parsed, items: filtered }));
      return filtered.length;
    } catch (error) {
      console.warn(`Failed to clear old cache for ${key}`, error);
      return null;
    }
  }

  async clearOnLogout(keys: string[]) {
    await AsyncStorage.multiRemove(keys);
  }
}

const cacheManager = new CacheManager();
export default cacheManager;
