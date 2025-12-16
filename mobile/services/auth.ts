import * as SecureStore from 'expo-secure-store';
import api from './api';
import { API_ENDPOINTS } from './endpoints';
import { AuthTokens } from '../types/api';
import { UserProfile } from '../store/slices/authSlice';

const ACCESS_TOKEN_KEY = 'paperboi-token';
const REFRESH_TOKEN_KEY = 'paperboi-refresh-token';

const persistTokens = async (tokens: AuthTokens) => {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
  if (tokens.refreshToken) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }
};

export const login = async (email: string, password: string): Promise<UserProfile> => {
  const { data } = await api.post(API_ENDPOINTS.auth.login, { email, password });
  await persistTokens(data);
  return { id: data.id, email: data.email, name: data.name } as UserProfile;
};

export const register = async (
  name: string,
  email: string,
  password: string,
): Promise<UserProfile> => {
  const { data } = await api.post(API_ENDPOINTS.auth.register, { name, email, password });
  await persistTokens(data);
  return { id: data.id, email: data.email, name: data.name } as UserProfile;
};

export const refreshAccessToken = async () => {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    return null;
  }

  const { data } = await api.post(API_ENDPOINTS.auth.refresh, { refreshToken });
  await persistTokens(data);
  return data.accessToken as string;
};

export const getAuthToken = async () => SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
export const getRefreshToken = async () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

export const clearTokens = async () => {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
};

export const logout = async () => {
  try {
    await api.post(API_ENDPOINTS.auth.logout);
  } finally {
    await clearTokens();
  }
};
