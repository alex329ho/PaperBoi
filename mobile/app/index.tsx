import React, { useEffect } from 'react';
import { View, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { APP_NAME, DESCRIPTION } from '../utils/constants';

const SplashScreen = () => {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(tabs)/home');
    }, 800);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <Image source={require('../assets/images/logo.png')} style={{ width: 120, height: 120 }} />
      <Text variant="headlineMedium">{APP_NAME}</Text>
      <Text>{DESCRIPTION}</Text>
    </View>
  );
};

export default SplashScreen;
