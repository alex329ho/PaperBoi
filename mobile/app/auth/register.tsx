import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, TextInput, Text } from 'react-native-paper';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { isEmail, isStrongPassword } from '../../utils/validation';

const RegisterScreen = () => {
  const { createAccount, loading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    await createAccount(name, email, password);
    router.replace('/(tabs)/home');
  };

  const disabled = !name || !isEmail(email) || !isStrongPassword(password);

  return (
    <View style={{ flex: 1, padding: 16, justifyContent: 'center', gap: 12 }}>
      <Text variant="headlineSmall">Join PaperBoi</Text>
      <TextInput label="Name" value={name} onChangeText={setName} />
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <Button mode="contained" onPress={handleRegister} disabled={disabled} loading={loading}>
        Create account
      </Button>
      <Link href="/auth/login">Have an account? Sign in</Link>
    </View>
  );
};

export default RegisterScreen;
