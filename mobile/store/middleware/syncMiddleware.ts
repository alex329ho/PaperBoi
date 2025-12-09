import { Middleware } from '@reduxjs/toolkit';
import {
  fetchArticleDetail,
  fetchNews,
  generateSummary,
  searchNews,
} from '../thunks/newsThunks';
import { fetchPreferences, updatePreferences } from '../thunks/preferencesThunks';
import { loginUser, logoutUser, refreshToken, registerUser } from '../thunks/authThunks';
import {
  addPendingAction,
  removePendingAction,
  setIsSyncing,
  setLastSync,
  setSyncError,
  updatePendingAction,
} from '../slices/syncSlice';
import { RootState, SyncPendingAction } from '../types';

const offlineActionCreators: Record<string, any> = {};

const registerOfflineActions = () => {
  const actions = [
    loginUser,
    registerUser,
    refreshToken,
    logoutUser,
    fetchNews,
    fetchArticleDetail,
    generateSummary,
    searchNews,
    fetchPreferences,
    updatePreferences,
  ];
  actions.forEach((creator) => {
    if (creator.typePrefix) {
      offlineActionCreators[creator.typePrefix] = creator;
    }
  });
};

registerOfflineActions();

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const MAX_RETRIES = 5;

const syncMiddleware: Middleware = (storeApi) => {
  let processing = false;

  const processQueue = async () => {
    if (processing) return;
    const state = storeApi.getState();
    if (!state.sync.pendingActions.length || state.ui.networkStatus !== 'online') {
      return;
    }
    processing = true;
    storeApi.dispatch(setIsSyncing(true));

    for (const pending of [...storeApi.getState().sync.pendingActions]) {
      if (storeApi.getState().ui.networkStatus === 'offline') {
        break;
      }
      const actionCreator = offlineActionCreators[pending.actionType];
      if (!actionCreator) {
        storeApi.dispatch(removePendingAction(pending.id));
        continue;
      }

      try {
        const result = await storeApi.dispatch(actionCreator(pending.args));
        const status = (result as any)?.meta?.requestStatus;
        const errorMessage = (result as any)?.error?.message as string | undefined;
        if (status === 'fulfilled') {
          storeApi.dispatch(removePendingAction(pending.id));
          storeApi.dispatch(setLastSync(Date.now()));
          storeApi.dispatch(setSyncError(null));
        } else {
          const nextAttempt = pending.attempt + 1;
          const backoff = Math.min(30000, 1000 * 2 ** pending.attempt);
          const isRetryable = nextAttempt <= MAX_RETRIES || pending.critical;
          storeApi.dispatch(
            updatePendingAction({
              id: pending.id,
              changes: { attempt: nextAttempt, lastError: errorMessage },
            }),
          );
          if (!isRetryable) {
            storeApi.dispatch(setSyncError(errorMessage ?? 'Sync failed after retries'));
            storeApi.dispatch(removePendingAction(pending.id));
            continue;
          }
          await delay(backoff);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected sync error';
        storeApi.dispatch(
          updatePendingAction({ id: pending.id, changes: { lastError: message, attempt: pending.attempt + 1 } }),
        );
        await delay(Math.min(30000, 1000 * 2 ** pending.attempt));
      }
    }

    storeApi.dispatch(setIsSyncing(false));
    processing = false;
  };

  return (next) => (action: any) => {
    const state = storeApi.getState();
    if (typeof action === 'function' && state.ui.networkStatus === 'offline') {
      const typePrefix = (action as any).typePrefix || action.name || 'anonymousThunk';
      const pendingAction: SyncPendingAction = {
        id: `${typePrefix}-${Date.now()}`,
        actionType: typePrefix,
        args: (action as any).arg,
        attempt: 0,
        createdAt: Date.now(),
        critical: false,
      };
      storeApi.dispatch(addPendingAction(pendingAction));
      return Promise.resolve();
    }

    const result = next(action);

    if (action.type === 'ui/setNetwork' && action.payload === 'online') {
      processQueue();
    }

    if (action.type === addPendingAction.type) {
      processQueue();
    }

    return result;
  };
};

export default syncMiddleware;
