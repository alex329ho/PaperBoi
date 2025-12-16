import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SyncPendingAction, SyncState } from '../types';

const initialState: SyncState = {
  pendingActions: [],
  isSync: false,
  lastSync: null,
  syncError: null,
};

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    addPendingAction(state, action: PayloadAction<SyncPendingAction>) {
      const exists = state.pendingActions.some((item) => item.id === action.payload.id);
      if (!exists) {
        state.pendingActions.push(action.payload);
      }
    },
    removePendingAction(state, action: PayloadAction<string>) {
      state.pendingActions = state.pendingActions.filter((item) => item.id !== action.payload);
    },
    updatePendingAction(
      state,
      action: PayloadAction<{ id: string; changes: Partial<SyncPendingAction> }>,
    ) {
      const target = state.pendingActions.find((item) => item.id === action.payload.id);
      if (target) {
        Object.assign(target, action.payload.changes);
      }
    },
    clearPendingActions(state) {
      state.pendingActions = [];
    },
    setIsSyncing(state, action: PayloadAction<boolean>) {
      state.isSync = action.payload;
    },
    setSyncError(state, action: PayloadAction<string | null>) {
      state.syncError = action.payload;
    },
    setLastSync(state, action: PayloadAction<number>) {
      state.lastSync = action.payload;
    },
  },
});

export const {
  addPendingAction,
  removePendingAction,
  updatePendingAction,
  clearPendingActions,
  setIsSyncing,
  setSyncError,
  setLastSync,
} = syncSlice.actions;
export default syncSlice.reducer;
