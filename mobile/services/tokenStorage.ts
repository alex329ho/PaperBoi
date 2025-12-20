import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'paperboi-token';
const REFRESH_TOKEN_KEY = 'paperboi-refresh-token';
const secureStoreAvailable = async () => {
  if (Platform.OS === 'web') return false;
  if (typeof SecureStore.isAvailableAsync === 'function') {
    try {
      return await SecureStore.isAvailableAsync();
    } catch {
      return false;
    }
  }
  return true;
};

export const getAuthToken = async () =>
  (await secureStoreAvailable())
    ? SecureStore.getItemAsync(ACCESS_TOKEN_KEY)
    : AsyncStorage.getItem(ACCESS_TOKEN_KEY);
export const getRefreshToken = async () =>
  (await secureStoreAvailable())
    ? SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
    : AsyncStorage.getItem(REFRESH_TOKEN_KEY);

export const setAccessToken = async (token: string) =>
  (await secureStoreAvailable())
    ? SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token)
    : AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);

export const setRefreshToken = async (token: string) =>
  (await secureStoreAvailable())
    ? SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token)
    : AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);

export const clearTokens = async () => {
  if (await secureStoreAvailable()) {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    return;
  }
  await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
  await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
};
