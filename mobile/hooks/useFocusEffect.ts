import { useCallback, useEffect } from 'react';
import { useFocusEffect as useNavigationFocusEffect } from '@react-navigation/native';

export const useFocusEffect = (callback: () => void | (() => void)) => {
  const memoizedCallback = useCallback(callback, [callback]);

  useNavigationFocusEffect(memoizedCallback);

  useEffect(() => {
    return () => {
      const cleanup = callback();
      if (typeof cleanup === 'function') cleanup();
    };
  }, [callback]);
};
