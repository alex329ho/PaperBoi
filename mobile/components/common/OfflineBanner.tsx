import React from 'react';
import { Banner } from 'react-native-paper';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

const OfflineBanner: React.FC = () => {
  const status = useNetworkStatus();
  const isOffline = status ? !status.isConnected : false;

  return (
    <Banner visible={isOffline} icon="wifi-off">
      You are currently offline. Some features may be unavailable.
    </Banner>
  );
};

export default OfflineBanner;
