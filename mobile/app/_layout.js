import React, { useEffect, useMemo } from 'react';
import { DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { PaperProvider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import { FontDisplay, useFonts } from 'expo-font';
import { Animated, Platform } from 'react-native';
import { store, persistor } from '../store/store';
import AppErrorBoundary from '../components/common/ErrorBoundary';
import OfflineBanner from '../components/common/OfflineBanner';
import ToastNotification from '../components/common/ToastNotification';
import { useAppSelector } from '../hooks/useRedux';
import { useTheme } from '../hooks/useTheme';

SplashScreen.preventAutoHideAsync();

// React Native Web lacks the native animated module; force JS driver in dev.
const ensureWebAnimatedDriverDisabled = () => {
  if (Platform.OS !== 'web') return;
  if (globalThis.__paperboiWebAnimatedPatched) return;
  globalThis.__paperboiWebAnimatedPatched = true;
  const disableWebDriver = (original) => (value, config) =>
    original(value, { ...(config || {}), useNativeDriver: false });
  Animated.timing = disableWebDriver(Animated.timing);
  Animated.spring = disableWebDriver(Animated.spring);
  Animated.decay = disableWebDriver(Animated.decay);
};

ensureWebAnimatedDriverDisabled();

const suppressWebWarnings = () => {
  if (Platform.OS !== 'web') return;
  if (globalThis.__paperboiWebWarnPatched) return;
  globalThis.__paperboiWebWarnPatched = true;
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const message = args[0];
    if (typeof message === 'string') {
      if (
        message.includes('props.pointerEvents is deprecated') ||
        message.includes('"shadow*" style props are deprecated')
      ) {
        return;
      }
    }
    originalWarn(...args);
  };
};

suppressWebWarnings();

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
  const rozhaRegular = require('../assets/fonts/RozhaOne-Regular.ttf');
  const rozhaMedium = require('../assets/fonts/RozhaOne-Medium.ttf');
  const rozhaSemiBold = require('../assets/fonts/RozhaOne-SemiBold.ttf');
  const rozhaBold = require('../assets/fonts/RozhaOne-Bold.ttf');
  const iconFont = MaterialCommunityIcons.font;
  const iconFontEntries = Object.keys(iconFont).reduce((acc, fontFamily) => {
    const source = iconFont[fontFamily];
    acc[fontFamily] =
      Platform.OS === 'web'
        ? {
            uri: Asset.fromModule(source).uri,
            display: FontDisplay.OPTIONAL,
          }
        : source;
    return acc;
  }, {});

  const [fontsLoaded, fontError] = useFonts({
    ...iconFontEntries,
    ...(Platform.OS === 'web'
      ? {
          'RozhaOne-Regular': {
            uri: Asset.fromModule(rozhaRegular).uri,
            display: FontDisplay.OPTIONAL,
          },
          'RozhaOne-Medium': {
            uri: Asset.fromModule(rozhaMedium).uri,
            display: FontDisplay.OPTIONAL,
          },
          'RozhaOne-SemiBold': {
            uri: Asset.fromModule(rozhaSemiBold).uri,
            display: FontDisplay.OPTIONAL,
          },
          'RozhaOne-Bold': {
            uri: Asset.fromModule(rozhaBold).uri,
            display: FontDisplay.OPTIONAL,
          },
        }
      : {
          'RozhaOne-Regular': rozhaRegular,
          'RozhaOne-Medium': rozhaMedium,
          'RozhaOne-SemiBold': rozhaSemiBold,
          'RozhaOne-Bold': rozhaBold,
        }),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (fontError) {
      console.warn('Font loading error', fontError);
    }
  }, [fontError]);

  if (!fontsLoaded && !fontError) return null;

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
