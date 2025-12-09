import React, { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Header from '@components/common/Header';
import { isEmail, isNotEmpty } from '@utils/validation';
import { useAuth } from '@hooks/useAuth';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { login } = useAuth();

  const onSubmit = async () => {
    if (!isEmail(email) || !isNotEmpty(password)) return;
    await login(email, password);
    router.replace('/(tabs)/home');
  };

  return (
    <View style={styles.container}>
      <Header title="Welcome back" subtitle="Log in to continue" />
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button title="Login" onPress={onSubmit} />
      <Text style={styles.link} onPress={() => router.push('/auth/register')}>
        Create account
      </Text>
      <Text style={styles.link} onPress={() => router.push('/auth/forgot-password')}>
        Forgot password?
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12
  },
  link: {
    color: '#2563eb',
    marginTop: 8
  }
});

export default LoginScreen;
