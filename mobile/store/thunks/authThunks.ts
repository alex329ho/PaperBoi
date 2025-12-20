import { createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../services/endpoints';
import { addPendingAction } from '../slices/syncSlice';
import { RootState, UserProfile } from '../types';

type AuthResponse = {
  user: UserProfile;
  token: string;
};

type Credentials = { email: string; password: string };
type RegisterPayload = Credentials & { name: string };

type OfflineOptions = { critical?: boolean };

const enqueueWhenOffline = async (
  thunkApi: Parameters<Parameters<typeof createAsyncThunk>[1]>[1],
  actionType: string,
  args: unknown,
  options: OfflineOptions = {},
) => {
  const { dispatch } = thunkApi;
  dispatch(
    addPendingAction({
      id: `${actionType}-${Date.now()}`,
      actionType,
      args,
      attempt: 0,
      critical: options.critical,
      createdAt: Date.now(),
    }),
  );
  return thunkApi.rejectWithValue('offline');
};

export const loginUser = createAsyncThunk<AuthResponse, Credentials, { state: RootState }>(
  'auth/loginUser',
  async (credentials, thunkApi) => {
    const { getState } = thunkApi;
    const state = getState();
    if (state.ui.networkStatus !== 'online') {
      return enqueueWhenOffline(thunkApi, 'auth/loginUser', credentials, { critical: true });
    }

    try {
      const response = await apiClient.post(API_ENDPOINTS.auth.login, credentials);
      const data = ((response.data as any)?.data ?? response.data) as AuthResponse;
      await AsyncStorage.setItem('paperboi_token', data.token);
      await AsyncStorage.setItem('paperboi_user', JSON.stringify(data.user));
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error during login';
      return thunkApi.rejectWithValue(message);
    }
  },
);

export const registerUser = createAsyncThunk<AuthResponse, RegisterPayload, { state: RootState }>(
  'auth/registerUser',
  async (payload, thunkApi) => {
    const { getState } = thunkApi;
    if (getState().ui.networkStatus !== 'online') {
      return enqueueWhenOffline(thunkApi, 'auth/registerUser', payload, { critical: true });
    }

    try {
      const response = await apiClient.post(API_ENDPOINTS.auth.register, payload);
      const data = ((response.data as any)?.data ?? response.data) as AuthResponse;
      await AsyncStorage.setItem('paperboi_token', data.token);
      await AsyncStorage.setItem('paperboi_user', JSON.stringify(data.user));
      return data;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unexpected error during registration';
      return thunkApi.rejectWithValue(message);
    }
  },
);

export const refreshToken = createAsyncThunk<AuthResponse, void, { state: RootState }>(
  'auth/refreshToken',
  async (_, thunkApi) => {
    const { getState } = thunkApi;
    const currentToken = getState().auth.token || (await AsyncStorage.getItem('paperboi_token'));
    if (!currentToken) {
      return thunkApi.rejectWithValue('No token available');
    }

    try {
      const response = await apiClient.post(
        API_ENDPOINTS.auth.refresh,
        {},
        { headers: { Authorization: `Bearer ${currentToken}` } },
      );
      const data = ((response.data as any)?.data ?? response.data) as AuthResponse;
      await AsyncStorage.setItem('paperboi_token', data.token);
      if (data.user) {
        await AsyncStorage.setItem('paperboi_user', JSON.stringify(data.user));
      }
      return data;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unexpected error during token refresh';
      await AsyncStorage.removeItem('paperboi_token');
      await AsyncStorage.removeItem('paperboi_user');
      return thunkApi.rejectWithValue(message);
    }
  },
);

export const logoutUser = createAsyncThunk<{ success: boolean }, void, { state: RootState }>(
  'auth/logoutUser',
  async (_, thunkApi) => {
    const { getState } = thunkApi;
    const token = getState().auth.token;
    if (getState().ui.networkStatus !== 'online') {
      return enqueueWhenOffline(thunkApi, 'auth/logoutUser', undefined, { critical: true });
    }

    try {
      await apiClient.post(API_ENDPOINTS.auth.logout, undefined, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      await AsyncStorage.removeItem('paperboi_token');
      await AsyncStorage.removeItem('paperboi_user');
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error during logout';
      return thunkApi.rejectWithValue(message);
    }
  },
);
