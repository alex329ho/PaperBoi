import { AnyAction, Middleware } from '@reduxjs/toolkit';
import type { ThunkDispatch } from 'redux-thunk';
import { fetchArticleDetail, fetchNews, generateSummary, searchNews } from '../thunks/newsThunks';
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

type OfflineActionCreator = ((...args: unknown[]) => unknown) & { typePrefix?: string };
type ThunkResult = { meta?: { requestStatus?: string }; error?: { message?: string } };
type ActionWithArgs = { arg?: unknown; payload?: unknown; typePrefix?: string; name?: string };

const offlineActionCreators: Record<string, OfflineActionCreator> = {};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const isReduxAction = (value: unknown): value is { type: string; payload?: unknown } =>
  isRecord(value) && typeof value.type === 'string';

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

const syncMiddleware: Middleware<Record<string, never>, RootState> = (storeApi) => {
  const dispatch = storeApi.dispatch as ThunkDispatch<RootState, unknown, AnyAction>;
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
      const actionCreator =
        typeof pending.originalAction === 'function'
          ? (pending.originalAction as OfflineActionCreator)
          : offlineActionCreators[pending.actionType];
      if (!actionCreator) {
        storeApi.dispatch(removePendingAction(pending.id));
        continue;
      }

      try {
        const actionToDispatch =
          typeof actionCreator === 'function' && actionCreator.typePrefix
            ? actionCreator(pending.args)
            : actionCreator;
        const result = (await dispatch(actionToDispatch as AnyAction)) as ThunkResult;
        const status = result.meta?.requestStatus;
        const errorMessage = result.error?.message;
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
          updatePendingAction({
            id: pending.id,
            changes: { lastError: message, attempt: pending.attempt + 1 },
          }),
        );
        await delay(Math.min(30000, 1000 * 2 ** pending.attempt));
      }
    }

    storeApi.dispatch(setIsSyncing(false));
    processing = false;
  };

  return (next) => (action: unknown) => {
    const state = storeApi.getState();
    if (typeof action === 'function' && state.ui.networkStatus === 'offline') {
      const actionWithArgs = action as ActionWithArgs;
      const typePrefix = actionWithArgs.typePrefix || actionWithArgs.name || 'anonymousThunk';
      const uniqueId = `${typePrefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const pendingAction: SyncPendingAction = {
        id: uniqueId,
        actionType: typePrefix,
        args: actionWithArgs.arg ?? actionWithArgs.payload,
        originalAction: action,
        attempt: 0,
        createdAt: Date.now(),
        critical: false,
      };
      storeApi.dispatch(addPendingAction(pendingAction));
      return Promise.resolve();
    }

    const result = next(action as AnyAction);

    if (isReduxAction(action) && action.type === 'ui/setNetwork' && action.payload === 'online') {
      processQueue();
    }

    if (isReduxAction(action) && action.type === addPendingAction.type) {
      processQueue();
    }

    return result;
  };
};

export default syncMiddleware;
