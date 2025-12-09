import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Toast, UIState } from '../types';

const initialState: UIState = {
  theme: 'light',
  isOffline: false,
  toasts: [],
  networkStatus: 'online',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<'light' | 'dark'>) {
      state.theme = action.payload;
    },
    setOfflineStatus(state, action: PayloadAction<boolean>) {
      state.isOffline = action.payload;
      state.networkStatus = action.payload ? 'offline' : 'online';
    },
    addToast(state, action: PayloadAction<Toast>) {
      state.toasts.push(action.payload);
    },
    removeToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },
    setNetwork(state, action: PayloadAction<UIState['networkStatus']>) {
      state.networkStatus = action.payload;
      state.isOffline = action.payload === 'offline';
    },
  },
});

export const { setTheme, setOfflineStatus, addToast, removeToast, setNetwork } = uiSlice.actions;
export default uiSlice.reducer;
