import AsyncStorage from '@react-native-async-storage/async-storage';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import { createTransform } from 'redux-persist';
import type { RootState } from './store';

type PersistedSlice = Record<string, unknown> & {
  isLoading?: unknown;
  error?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const stripTransientState = createTransform(
  (inboundState: PersistedSlice | null) => {
    if (!inboundState) return inboundState;
    // Remove transient flags such as loading and error before persisting
    const { isLoading: _isLoading, error: _error, ...rest } = inboundState;
    return rest;
  },
  null,
  { whitelist: ['auth', 'news', 'preferences', 'sync'] },
);

const persistConfig = {
  key: 'paperboi-root',
  storage: AsyncStorage,
  version: 1,
  whitelist: ['auth', 'news', 'preferences', 'sync'],
  blacklist: ['ui'],
  stateReconciler: autoMergeLevel2,
  transforms: [stripTransientState],
  migrate: async (persistedState, currentVersion) => {
    if (!persistedState) return persistedState as RootState | undefined;
    const stateRecord = persistedState as Record<string, unknown>;
    const persistMeta = isRecord(stateRecord._persist) ? stateRecord._persist : undefined;
    const persistedVersion =
      persistMeta && typeof persistMeta.version === 'number' ? persistMeta.version : undefined;
    if (persistedVersion !== undefined && persistedVersion !== currentVersion) {
      // Clear transient caches on version bump to avoid stale data
      await AsyncStorage.removeItem('paperboi_bookmarks');
      await AsyncStorage.removeItem('paperboi_bookmarked_articles');
    }
    return persistedState as RootState;
  },
};

export default persistConfig;
