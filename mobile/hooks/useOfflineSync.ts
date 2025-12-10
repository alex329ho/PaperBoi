import { useCallback, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { backgroundSync } from '../services/backgroundTasks';
import storageService from '../services/storage';

export const useOfflineSync = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  const triggerSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await backgroundSync();
      setLastSync(result.lastSync ?? null);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    const subscription = NetInfo.addEventListener((state) => {
      setIsOnline(Boolean(state.isConnected));
      if (state.isConnected) {
        void triggerSync();
      }
    });
    void (async () => {
      setLastSync(await storageService.getLastSync());
    })();
    return () => subscription.unsubscribe();
  }, [triggerSync]);

  return { isSyncing, lastSync, triggerSync, isOnline };
};

export default useOfflineSync;
