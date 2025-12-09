import React from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';
import PreferenceSection from '../../components/settings/PreferenceSection';
import TopicSelector from '../../components/settings/TopicSelector';
import RegionSelector from '../../components/settings/RegionSelector';
import TimePickerModal from '../../components/settings/TimePickerModal';
import NotificationToggle from '../../components/settings/NotificationToggle';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { setTopics, setRegions, setDigestTime } from '../../store/slices/preferencesSlice';
import { toggleAnalytics, toggleNotifications } from '../../store/slices/settingsSlice';

const availableTopics = ['Business', 'Technology', 'Sports', 'Health'];
const availableRegions = ['US', 'EU', 'Asia'];

const SettingsScreen = () => {
  const dispatch = useAppDispatch();
  const { topics, regions, digestTime } = useAppSelector((state) => state.preferences);
  const settings = useAppSelector((state) => state.settings);

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text variant="headlineSmall" style={{ marginBottom: 16 }}>
        Settings
      </Text>
      <PreferenceSection title="Notifications">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text>Enable push notifications</Text>
          <NotificationToggle value={settings.notificationsEnabled} onToggle={(value) => dispatch(toggleNotifications(value))} />
        </View>
      </PreferenceSection>
      <PreferenceSection title="Analytics">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text>Allow analytics</Text>
          <NotificationToggle value={settings.analyticsEnabled} onToggle={(value) => dispatch(toggleAnalytics(value))} />
        </View>
      </PreferenceSection>
      <PreferenceSection title="Digest Schedule">
        <TimePickerModal value={digestTime} onChange={(value) => dispatch(setDigestTime(value))} />
      </PreferenceSection>
      <PreferenceSection title="Topics">
        <TopicSelector topics={availableTopics} selected={topics} onChange={(next) => dispatch(setTopics(next))} />
      </PreferenceSection>
      <PreferenceSection title="Regions">
        <RegionSelector regions={availableRegions} selected={regions} onChange={(next) => dispatch(setRegions(next))} />
      </PreferenceSection>
    </ScrollView>
  );
};

export default SettingsScreen;
