import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, TextInput, Text } from 'react-native-paper';
import { Link } from 'expo-router';
import { isEmail } from '../../utils/validation';

const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    setSubmitted(true);
  };

  return (
    <View style={{ flex: 1, padding: 16, justifyContent: 'center', gap: 12 }}>
      <Text variant="headlineSmall">Reset password</Text>
      <TextInput label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Button mode="contained" disabled={!isEmail(email)} onPress={handleSubmit}>
        Send reset link
      </Button>
      {submitted ? <Text>Check your email for reset instructions.</Text> : null}
      <Link href="/auth/login">Back to login</Link>
    </View>
  );
};

export default ForgotPasswordScreen;
