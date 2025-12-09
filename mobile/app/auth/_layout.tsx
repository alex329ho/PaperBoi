import React from 'react';
import { Stack } from 'expo-router';

const AuthLayout = () => (
  <Stack>
    <Stack.Screen name="login" options={{ title: 'Login' }} />
    <Stack.Screen name="register" options={{ title: 'Register' }} />
    <Stack.Screen name="forgot-password" options={{ title: 'Reset Password' }} />
  </Stack>
);

export default AuthLayout;
