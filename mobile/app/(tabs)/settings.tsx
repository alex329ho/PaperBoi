import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  Avatar,
  Button,
  Dialog,
  Divider,
  List,
  Portal,
  Snackbar,
  Switch,
  Text,
} from 'react-native-paper';
import PreferenceForm from '../../components/settings/PreferenceForm';
import { usePreferences } from '../../hooks/usePreferences';

const SettingsScreen = () => {
  const { preferences, savePreferences, saving, status, toggleTheme, mode } = usePreferences();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const formValues = useMemo(() => preferences, [preferences]);

  const onSave = async (values: typeof preferences) => {
    await savePreferences(values);
    setShowToast(true);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <Avatar.Icon icon="account" size={48} accessibilityLabel="User profile" />
        <View>
          <Text variant="headlineSmall">Settings</Text>
          <Text accessibilityLabel={`App version 1.0.0 in ${mode} mode`}>
            PaperBoi Mobile • v1.0.0
          </Text>
        </View>
        <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text>{mode === 'dark' ? 'Dark' : 'Light'} mode</Text>
          <Switch
            accessibilityLabel="Toggle theme"
            value={mode === 'dark'}
            onValueChange={toggleTheme}
          />
        </View>
      </View>

      <Divider style={{ marginVertical: 12 }} />

      <List.Section title="Preferences" accessibilityRole="header">
        <PreferenceForm initialValues={formValues} onSave={onSave} loading={saving} />
      </List.Section>

      {status === 'success' ? (
        <Text style={{ marginTop: 12 }}>Preferences saved successfully.</Text>
      ) : status === 'error' ? (
        <Text style={{ marginTop: 12, color: 'red' }}>Unable to save preferences. Try again.</Text>
      ) : null}

      <Divider style={{ marginVertical: 12 }} />

      <List.Section title="About" accessibilityRole="header">
        <List.Item
          title="Notifications"
          description="Daily digest and push alerts"
          left={(props) => <List.Icon {...props} icon="bell" />}
        />
        <List.Item
          title="Email preferences"
          description="Delivery frequency for newsletters"
          left={(props) => <List.Icon {...props} icon="email" />}
        />
        <List.Item
          title="Summary length"
          description="Adjust how detailed summaries are"
          left={(props) => <List.Icon {...props} icon="text-long" />}
        />
        <List.Item
          title="Version"
          description="1.0.0"
          left={(props) => <List.Icon {...props} icon="information" />}
        />
      </List.Section>

      <Button
        mode="outlined"
        icon="logout"
        onPress={() => setShowLogoutConfirm(true)}
        accessibilityLabel="Logout"
      >
        Logout
      </Button>

      <Portal>
        <Dialog visible={showLogoutConfirm} onDismiss={() => setShowLogoutConfirm(false)}>
          <Dialog.Title>Logout</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to logout?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowLogoutConfirm(false)}>Cancel</Button>
            <Button mode="contained" onPress={() => setShowLogoutConfirm(false)}>
              Confirm
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={showToast}
        onDismiss={() => setShowToast(false)}
        duration={3000}
        accessibilityLiveRegion="polite"
      >
        Preferences saved
      </Snackbar>
    </ScrollView>
  );
};

export default SettingsScreen;
