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
import { useAppDispatch } from '../../hooks/useRedux';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../services/endpoints';
import { fetchFeed } from '../../store/slices/newsSlice';
import { extractApiData } from '../../utils/api';

const SettingsScreen = () => {
  const { preferences, savePreferences, saving, status, toggleTheme, mode } = usePreferences();
  const dispatch = useAppDispatch();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [fetchingSample, setFetchingSample] = useState(false);

  const formValues = useMemo(() => preferences, [preferences]);

  const onSave = async (values: typeof preferences) => {
    await savePreferences(values);
    setToastMessage('Preferences saved');
  };

  const fetchSampleArticles = async () => {
    if (fetchingSample) return;
    setFetchingSample(true);
    try {
      const response = await apiClient.post(API_ENDPOINTS.news.fetchFresh, {
        query: 'ai',
        timespan: '1day',
      });
      const payload = extractApiData<unknown>(response.data);
      const responseBody = response.data as Record<string, unknown> | undefined;
      const savedCount =
        responseBody && typeof responseBody.saved_count === 'number'
          ? responseBody.saved_count
          : typeof responseBody?.savedCount === 'number'
            ? responseBody.savedCount
            : undefined;
      const count = Array.isArray(payload) ? payload.length : 0;
      const savedLabel =
        typeof savedCount === 'number' ? ` (saved ${savedCount})` : '';
      setToastMessage(
        count
          ? `Fetched ${count} sample articles from GDELT${savedLabel}.`
          : 'Fetch completed, but no articles were returned.',
      );
      dispatch(fetchFeed({ page: 1 }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to fetch sample articles';
      setToastMessage(message);
    } finally {
      setFetchingSample(false);
    }
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

      <List.Section title="Developer" accessibilityRole="header">
        <Text style={{ marginBottom: 8 }}>
          Pull a fresh batch of real articles from GDELT to seed the mobile feed.
        </Text>
        <Button
          mode="outlined"
          icon="cloud-download"
          onPress={fetchSampleArticles}
          loading={fetchingSample}
          disabled={fetchingSample}
        >
          Fetch sample articles
        </Button>
      </List.Section>

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
        visible={Boolean(toastMessage)}
        onDismiss={() => setToastMessage(null)}
        duration={3000}
        accessibilityLiveRegion="polite"
      >
        {toastMessage ?? ''}
      </Snackbar>
    </ScrollView>
  );
};

export default SettingsScreen;
