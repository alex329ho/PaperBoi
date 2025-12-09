import { useFocusEffect as useNavigationFocusEffect } from 'expo-router';

export const useFocusEffect = (callback: () => void | (() => void)) => {
  useNavigationFocusEffect(() => {
    const cleanup = callback();
    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  });
};
