import { RootState } from '../types';

export const selectPreferencesState = (state: RootState) => state.preferences;
export const selectTopics = (state: RootState) => state.preferences.topics;
export const selectRegions = (state: RootState) => state.preferences.regions;
export const selectLanguages = (state: RootState) => state.preferences.languages;
export const selectNotificationTime = (state: RootState) => state.preferences.notificationTime;
export const selectSummaryLength = (state: RootState) => state.preferences.summaryLength;
export const selectEmailFrequency = (state: RootState) => state.preferences.emailFrequency;
export const selectPreferenceError = (state: RootState) => state.preferences.error;
export const selectPreferenceLoading = (state: RootState) => state.preferences.isLoading;
