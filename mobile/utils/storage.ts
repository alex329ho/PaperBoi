import AsyncStorage from '@react-native-async-storage/async-storage';

export const persistJson = async (key: string, value: unknown) => AsyncStorage.setItem(key, JSON.stringify(value));
export const readJson = async <T>(key: string): Promise<T | null> => {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : null;
};
