import { useCallback, useEffect, useState } from 'react';
import storage from '../utils/storage';

export const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [value, setValue] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const stored = await storage.getItem<T>(key);
    if (stored !== null) setValue(stored);
    setLoading(false);
  }, [key]);

  const persist = useCallback(
    async (next: T) => {
      setValue(next);
      await storage.setItem(key, next);
    },
    [key],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return { value, setValue: persist, loading, refresh: load };
};

export default useLocalStorage;
