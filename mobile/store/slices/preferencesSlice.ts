import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type PreferencesState = {
  topics: string[];
  regions: string[];
  languages: string[];
  digestTime?: string;
  notificationsEnabled: boolean;
  emailEnabled: boolean;
  emailFrequency: 'daily' | 'weekly' | 'monthly';
  summaryLength: 'short' | 'medium' | 'long';
};

const initialState: PreferencesState = {
  topics: [],
  regions: [],
  languages: [],
  digestTime: undefined,
  notificationsEnabled: true,
  emailEnabled: false,
  emailFrequency: 'weekly',
  summaryLength: 'medium',
};

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    setTopics(state, action: PayloadAction<string[]>) {
      state.topics = action.payload;
    },
    setRegions(state, action: PayloadAction<string[]>) {
      state.regions = action.payload;
    },
    setLanguages(state, action: PayloadAction<string[]>) {
      state.languages = action.payload;
    },
    setDigestTime(state, action: PayloadAction<string | undefined>) {
      state.digestTime = action.payload;
    },
    toggleNotifications(state, action: PayloadAction<boolean | undefined>) {
      state.notificationsEnabled = action.payload ?? !state.notificationsEnabled;
    },
    toggleEmail(state, action: PayloadAction<boolean | undefined>) {
      state.emailEnabled = action.payload ?? !state.emailEnabled;
    },
    setEmailFrequency(state, action: PayloadAction<PreferencesState['emailFrequency']>) {
      state.emailFrequency = action.payload;
    },
    setSummaryLength(state, action: PayloadAction<PreferencesState['summaryLength']>) {
      state.summaryLength = action.payload;
    },
  },
});

export const {
  setTopics,
  setRegions,
  setLanguages,
  setDigestTime,
  toggleNotifications,
  toggleEmail,
  setEmailFrequency,
  setSummaryLength,
} = preferencesSlice.actions;
export default preferencesSlice.reducer;
