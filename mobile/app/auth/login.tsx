import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, TextInput, Text } from 'react-native-paper';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { isEmail } from '../../utils/validation';

const LoginScreen = () => {
  const { signIn, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    await signIn(email, password);
    router.replace('/(tabs)/home');
  };

  const disabled = !isEmail(email) || !password;

  return (
    <View style={{ flex: 1, padding: 16, justifyContent: 'center', gap: 12 }}>
      <Text variant="headlineSmall">Welcome back</Text>
      <TextInput label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <Button mode="contained" onPress={handleLogin} disabled={disabled} loading={loading}>
        Sign in
      </Button>
      <Link href="/auth/forgot-password">Forgot password?</Link>
      <Link href="/auth/register">Create an account</Link>
    </View>
  );
};

export default LoginScreen;
