import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import networkManager from '../services/networkManager';

export const useNetworkStatus = () => {
  const [state, setState] = useState<NetInfoState | null>(networkManager.getStatus());

  useEffect(() => {
    const syncInitial = async () => {
      const fetched = await NetInfo.fetch();
      setState(fetched);
    };
    void syncInitial();
    const unsubscribe = networkManager.onStatusChange(setState);
    return unsubscribe;
  }, []);

  return state;
};

export default useNetworkStatus;
