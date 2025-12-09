import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type SettingsState = {
  notificationsEnabled: boolean;
  analyticsEnabled: boolean;
};

const initialState: SettingsState = {
  notificationsEnabled: true,
  analyticsEnabled: true,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    toggleNotifications(state, action: PayloadAction<boolean | undefined>) {
      state.notificationsEnabled = action.payload ?? !state.notificationsEnabled;
    },
    toggleAnalytics(state, action: PayloadAction<boolean | undefined>) {
      state.analyticsEnabled = action.payload ?? !state.analyticsEnabled;
    },
  },
});

export const { toggleNotifications, toggleAnalytics } = settingsSlice.actions;
export default settingsSlice.reducer;
