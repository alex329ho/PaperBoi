import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export const useNetworkStatus = () => {
  const [state, setState] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(setState);
    return () => unsubscribe();
  }, []);

  return state;
};
