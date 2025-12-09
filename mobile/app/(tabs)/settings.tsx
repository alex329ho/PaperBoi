import React, { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Divider, Text } from 'react-native-paper';
import PreferenceForm from '../../components/settings/PreferenceForm';
import { usePreferences } from '../../hooks/usePreferences';

const SettingsScreen = () => {
  const { preferences, savePreferences, saving, status, toggleTheme, mode } = usePreferences();

  const formValues = useMemo(() => preferences, [preferences]);

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="headlineSmall">Settings</Text>
        <Button icon={mode === 'dark' ? 'weather-night' : 'white-balance-sunny'} onPress={toggleTheme}>
          {mode === 'dark' ? 'Dark' : 'Light'} mode
        </Button>
      </View>
      <Divider style={{ marginVertical: 12 }} />
      <PreferenceForm initialValues={formValues} onSave={savePreferences} loading={saving} />
      {status === 'success' ? (
        <Text style={{ marginTop: 12 }}>Preferences saved successfully.</Text>
      ) : status === 'error' ? (
        <Text style={{ marginTop: 12, color: 'red' }}>Unable to save preferences. Try again.</Text>
      ) : null}
      <Divider style={{ marginVertical: 12 }} />
      <Button mode="outlined" icon="logout" onPress={() => {}} accessibilityLabel="Logout">
        Logout
      </Button>
      <Text style={{ marginTop: 8 }}>
        PaperBoi Mobile • v1.0.0
      </Text>
    </ScrollView>
  );
};

export default SettingsScreen;
