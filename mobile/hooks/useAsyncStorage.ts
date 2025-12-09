import { useCallback } from 'react';
import { storage } from '@utils/storage';

export const useAsyncStorage = () => {
  const setItem = useCallback(storage.set, []);
  const getItem = useCallback(storage.get, []);
  const removeItem = useCallback(storage.remove, []);

  return { setItem, getItem, removeItem };
};
