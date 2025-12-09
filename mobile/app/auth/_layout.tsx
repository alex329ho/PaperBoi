import { Stack } from 'expo-router';
import React from 'react';

const AuthLayout = () => (
  <Stack screenOptions={{ headerShown: false }}>
    <Stack.Screen name="login" />
    <Stack.Screen name="register" />
    <Stack.Screen name="forgot-password" />
  </Stack>
);

export default AuthLayout;
