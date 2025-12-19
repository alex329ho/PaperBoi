import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'paperboi-token';
const REFRESH_TOKEN_KEY = 'paperboi-refresh-token';

export const getAuthToken = async () => SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
export const getRefreshToken = async () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

export const setAccessToken = async (token: string) =>
  SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);

export const setRefreshToken = async (token: string) =>
  SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);

export const clearTokens = async () => {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
};
