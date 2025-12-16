import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAsyncStorage = <T>(key: string, initialValue: T) => {
  const [value, setValue] = useState<T>(initialValue);

  const load = useCallback(async () => {
    const storedValue = await AsyncStorage.getItem(key);
    if (storedValue) {
      setValue(JSON.parse(storedValue));
    }
  }, [key]);

  const update = useCallback(
    async (next: T) => {
      setValue(next);
      await AsyncStorage.setItem(key, JSON.stringify(next));
    },
    [key],
  );

  useEffect(() => {
    load();
  }, [load]);

  return { value, update };
};
