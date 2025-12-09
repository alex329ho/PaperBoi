import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ToastNotification from '@components/common/ToastNotification';
import OfflineBanner from '@components/common/OfflineBanner';
import ErrorBoundary from '@components/common/ErrorBoundary';
import { store, persistor } from '@store/store';
import { useNetworkStatus } from '@hooks/useNetworkStatus';

const NetworkWrapper = ({ children }: React.PropsWithChildren) => {
  const { isOnline } = useNetworkStatus();
  return (
    <>
      {!isOnline && <OfflineBanner />}
      {children}
    </>
  );
};

const RootLayout = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <ErrorBoundary>
              <NetworkWrapper>
                <Stack screenOptions={{ headerShown: false }} />
                <StatusBar style="auto" />
                <ToastNotification />
              </NetworkWrapper>
            </ErrorBoundary>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </PersistGate>
    </Provider>
  );
};

export default RootLayout;
