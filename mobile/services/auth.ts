import { getAuthToken as getStoredToken, setAccessToken, setRefreshToken, clearTokens as clearStoredTokens } from './tokenStorage';
import api from './api';
import { API_ENDPOINTS } from './endpoints';
import { AuthTokens } from '../types/api';
import { UserProfile } from '../store/slices/authSlice';

const persistTokens = async (tokens: AuthTokens) => {
  await setAccessToken(tokens.accessToken);
  if (tokens.refreshToken) {
    await setRefreshToken(tokens.refreshToken);
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
  const refreshToken = await getStoredToken();
  if (!refreshToken) {
    return null;
  }

  const { data } = await api.post(API_ENDPOINTS.auth.refresh, { refreshToken });
  await persistTokens(data);
  return data.accessToken as string;
};

export const clearTokens = async () => {
  await clearStoredTokens();
};

export const logout = async () => {
  try {
    await api.post(API_ENDPOINTS.auth.logout);
  } finally {
    await clearStoredTokens();
  }
};