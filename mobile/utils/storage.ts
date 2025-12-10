import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export interface StorageOptions {
  secure?: boolean;
  encrypt?: boolean;
}

const encode = (value: unknown, options?: StorageOptions) => {
  const serialized = JSON.stringify(value);
  if (options?.encrypt) {
    try {
      if (typeof Buffer !== 'undefined') {
        return Buffer.from(serialized, 'utf8').toString('base64');
      }
      return btoa(serialized);
    } catch (error) {
      console.warn('Failed to encrypt payload, storing in plain text', error);
    }
  }
  return serialized;
};

const decode = <T>(raw: string | null, options?: StorageOptions): T | null => {
  if (!raw) return null;
  let decoded = raw;
  if (options?.encrypt) {
    try {
      if (typeof Buffer !== 'undefined') {
        decoded = Buffer.from(raw, 'base64').toString('utf8');
      } else {
        decoded = atob(raw);
      }
    } catch (error) {
      console.warn('Failed to decrypt payload, returning raw JSON', error);
    }
  }
  try {
    return JSON.parse(decoded) as T;
  } catch (error) {
    console.warn('Failed to parse stored value', error);
    return null;
  }
};

const getByteSize = (value: string) => {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value).byteLength;
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.byteLength(value, 'utf8');
  }
  return value.length;
};

export const setItem = async <T>(key: string, value: T, options?: StorageOptions) => {
  const payload = encode(value, options);
  if (options?.secure) {
    await SecureStore.setItemAsync(key, payload);
    return;
  }
  await AsyncStorage.setItem(key, payload);
};

export const getItem = async <T>(key: string, options?: StorageOptions): Promise<T | null> => {
  if (options?.secure) {
    const raw = await SecureStore.getItemAsync(key);
    return decode<T>(raw, options);
  }
  const raw = await AsyncStorage.getItem(key);
  return decode<T>(raw, options);
};

export const removeItem = async (key: string, options?: StorageOptions) => {
  if (options?.secure) {
    await SecureStore.deleteItemAsync(key);
    return;
  }
  await AsyncStorage.removeItem(key);
};

export const clearAll = async () => AsyncStorage.clear();

export const getCacheSize = async (keys?: string[]) => {
  const storageKeys = keys ?? (await AsyncStorage.getAllKeys());
  const entries = await AsyncStorage.multiGet(storageKeys);
  return entries.reduce((acc, [, value]) => (value ? acc + getByteSize(value) : acc), 0);
};

export const persistJson = async (key: string, value: unknown) => setItem(key, value);

export const readJson = async <T>(key: string): Promise<T | null> => getItem<T>(key);

export default {
  setItem,
  getItem,
  removeItem,
  clearAll,
  getCacheSize,
  persistJson,
  readJson,
};
