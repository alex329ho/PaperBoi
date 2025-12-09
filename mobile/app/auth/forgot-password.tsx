import React, { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Header from '@components/common/Header';
import { isEmail } from '@utils/validation';

const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState('');
  const router = useRouter();

  const onSubmit = () => {
    if (!isEmail(email)) return;
    router.back();
  };

  return (
    <View style={styles.container}>
      <Header title="Reset password" subtitle="We'll send you reset instructions" />
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <Button title="Send reset link" onPress={onSubmit} />
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
  }
});

export default ForgotPasswordScreen;
