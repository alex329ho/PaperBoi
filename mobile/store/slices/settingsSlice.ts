import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type ThemeMode = 'light' | 'dark' | 'system';

interface SettingsState {
  theme: ThemeMode;
  notificationsEnabled: boolean;
}

const initialState: SettingsState = {
  theme: 'system',
  notificationsEnabled: true
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.theme = action.payload;
    },
    toggleNotifications(state, action: PayloadAction<boolean | undefined>) {
      state.notificationsEnabled = action.payload ?? !state.notificationsEnabled;
    }
  }
});

export const { setTheme, toggleNotifications } = settingsSlice.actions;
export default settingsSlice.reducer;
