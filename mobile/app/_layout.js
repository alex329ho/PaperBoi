import React, { useEffect, useMemo } from 'react';
import { DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { PaperProvider } from 'react-native-paper';
import { useFonts } from 'expo-font';
import { store, persistor } from '../store/store';
import AppErrorBoundary from '../components/common/ErrorBoundary';
import OfflineBanner from '../components/common/OfflineBanner';
import ToastNotification from '../components/common/ToastNotification';
import { useAppSelector } from '../hooks/useRedux';
import { useTheme } from '../hooks/useTheme';

SplashScreen.preventAutoHideAsync();

const RootProvider = ({ children }) => {
  const { theme } = useTheme();
  const error = useAppSelector((state) => state.ui.errorMessage);

  const navigationTheme = useMemo(
    () => ({
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        background: theme?.colors?.background ?? DefaultTheme.colors.background,
        primary: theme?.colors?.primary ?? DefaultTheme.colors.primary,
        text: theme?.colors?.onSurface ?? DefaultTheme.colors.text,
        card: theme?.colors?.surface ?? DefaultTheme.colors.card,
        border: theme?.colors?.outline ?? DefaultTheme.colors.border,
      },
    }),
    [theme],
  );

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <PaperProvider theme={theme}>
        <AppErrorBoundary>
          <OfflineBanner />
          {children}
          <ToastNotification visible={Boolean(error)} message={error || ''} onDismiss={() => {}} />
        </AppErrorBoundary>
      </PaperProvider>
    </NavigationThemeProvider>
  );
};

export function ErrorBoundary({ children }) {
  return <AppErrorBoundary>{children}</AppErrorBoundary>;
}

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
