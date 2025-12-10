import NetInfo from '@react-native-community/netinfo';
import storageService, { PendingAction } from './storage';

const sendOfflineAction = async (action: PendingAction) => {
  try {
    await fetch('/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action),
    });
    return true;
  } catch (error) {
    console.warn('Failed to push offline action', error);
    return false;
  }
};

export const processPendingActions = async () => {
  const network = await NetInfo.fetch();
  const isOnline = Boolean(network.isConnected);
  const queue = await storageService.getPendingActions();

  if (!isOnline || !queue.length) {
    return { synced: false, pending: queue.length };
  }

  const remaining: PendingAction[] = [];
  for (const action of queue) {
    const success = await sendOfflineAction(action);
    if (!success) {
      remaining.push(action);
    }
  }

  if (remaining.length) {
    await storageService.clearPendingActions();
    await Promise.all(remaining.map((action) => storageService.addPendingAction(action)));
  } else {
    await storageService.clearPendingActions();
  }

  return { synced: remaining.length === 0, pending: remaining.length };
};

export const backgroundSync = async () => {
  const syncResult = await processPendingActions();
  const lastSync = await storageService.saveLastSync(new Date());
  await storageService.clearOldData(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  return { ...syncResult, lastSync };
};

export const initializeBackgroundSync = () => {
  const unsubscribe = NetInfo.addEventListener(async (state) => {
    if (state.isConnected) {
      await backgroundSync();
    }
  });
  return unsubscribe;
};

export default {
  processPendingActions,
  backgroundSync,
  initializeBackgroundSync,
};
