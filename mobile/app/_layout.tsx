import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { PaperProvider } from 'react-native-paper';
import { useFonts } from 'expo-font';
import { store, persistor } from '../store/store';
import ErrorBoundary from '../components/common/ErrorBoundary';
import OfflineBanner from '../components/common/OfflineBanner';
import ToastNotification from '../components/common/ToastNotification';
import { useAppSelector } from '../hooks/useRedux';
import { useTheme } from '../hooks/useTheme';

SplashScreen.preventAutoHideAsync();

const RootProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { theme } = useTheme();
  const error = useAppSelector((state) => state.ui.errorMessage);

  return (
    <PaperProvider theme={theme}>
      <ErrorBoundary>
        <OfflineBanner />
        {children}
        <ToastNotification visible={Boolean(error)} message={error || ''} onDismiss={() => {}} />
      </ErrorBoundary>
    </PaperProvider>
  );
};

const RootLayout = () => {
  const [fontsLoaded] = useFonts({
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <RootProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="auth" />
            <Stack.Screen name="[article_id]" />
            <Stack.Screen name="index" />
          </Stack>
        </RootProvider>
      </PersistGate>
    </Provider>
  );
};

export default RootLayout;
