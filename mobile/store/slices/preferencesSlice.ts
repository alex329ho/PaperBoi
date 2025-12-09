import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchPreferences, savePreferencesLocally, updatePreferences } from '../thunks/preferencesThunks';
import { PreferencesState } from '../types';

const initialState: PreferencesState = {
  topics: [],
  regions: [],
  languages: [],
  notificationEnabled: true,
  notificationTime: '08:00',
  summaryLength: 'MEDIUM',
  emailFrequency: 'weekly',
  isLoading: false,
  error: null,
};

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    setPreferences(state, action: PayloadAction<PreferencesState>) {
      return { ...state, ...action.payload };
    },
    updateTopics(state, action: PayloadAction<string[]>) {
      state.topics = action.payload;
    },
    updateRegions(state, action: PayloadAction<string[]>) {
      state.regions = action.payload;
    },
    updateLanguages(state, action: PayloadAction<string[]>) {
      state.languages = action.payload;
    },
    setNotificationTime(state, action: PayloadAction<string>) {
      state.notificationTime = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPreferences.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPreferences.fulfilled, (state, action) => {
        return { ...state, ...action.payload, isLoading: false };
      })
      .addCase(fetchPreferences.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Unable to load preferences';
      })
      .addCase(updatePreferences.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updatePreferences.fulfilled, (state, action) => {
        return { ...state, ...action.payload, isLoading: false };
      })
      .addCase(updatePreferences.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Unable to update preferences';
      })
      .addCase(savePreferencesLocally.fulfilled, (state, action) => {
        return { ...state, ...action.payload };
      })
      .addCase(savePreferencesLocally.rejected, (state, action) => {
        state.error = action.error.message || 'Unable to save preferences locally';
      });
  },
});

export const {
  setPreferences,
  updateTopics,
  updateRegions,
  updateLanguages,
  setNotificationTime,
  setLoading,
  setError,
} = preferencesSlice.actions;
export default preferencesSlice.reducer;
