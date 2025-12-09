import { createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addPendingAction } from '../slices/syncSlice';
import { PreferencesState, RootState } from '../types';

const API_BASE_URL = 'https://api.paperboi.app';

const enqueueWhenOffline = async (
  thunkApi: Parameters<Parameters<typeof createAsyncThunk>[1]>[1],
  actionType: string,
  args: unknown,
) => {
  thunkApi.dispatch(
    addPendingAction({
      id: `${actionType}-${Date.now()}`,
      actionType,
      args,
      attempt: 0,
      createdAt: Date.now(),
      critical: false,
    }),
  );
  return thunkApi.rejectWithValue('offline');
};

export const fetchPreferences = createAsyncThunk<PreferencesState, void, { state: RootState }>(
  'preferences/fetchPreferences',
  async (_, thunkApi) => {
    if (thunkApi.getState().ui.networkStatus === 'offline') {
      return enqueueWhenOffline(thunkApi, 'preferences/fetchPreferences', undefined);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/preferences`);
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Unable to fetch preferences');
      }
      const data: PreferencesState = await response.json();
      await AsyncStorage.setItem('paperboi_preferences', JSON.stringify(data));
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error fetching preferences';
      const cached = await AsyncStorage.getItem('paperboi_preferences');
      if (cached) {
        return JSON.parse(cached) as PreferencesState;
      }
      return thunkApi.rejectWithValue(message);
    }
  },
);

export const updatePreferences = createAsyncThunk<PreferencesState, Partial<PreferencesState>, { state: RootState }>(
  'preferences/updatePreferences',
  async (updates, thunkApi) => {
    const { getState } = thunkApi;
    if (getState().ui.networkStatus === 'offline') {
      return enqueueWhenOffline(thunkApi, 'preferences/updatePreferences', updates);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Unable to update preferences');
      }
      const data: PreferencesState = await response.json();
      await AsyncStorage.setItem('paperboi_preferences', JSON.stringify(data));
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error updating preferences';
      return thunkApi.rejectWithValue(message);
    }
  },
);

export const savePreferencesLocally = createAsyncThunk<PreferencesState, PreferencesState, { state: RootState }>(
  'preferences/savePreferencesLocally',
  async (preferences, thunkApi) => {
    try {
      await AsyncStorage.setItem('paperboi_preferences', JSON.stringify(preferences));
      return preferences;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save preferences locally';
      return thunkApi.rejectWithValue(message);
    }
  },
);
