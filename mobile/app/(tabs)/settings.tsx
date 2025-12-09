import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import Header from '@components/common/Header';
import PreferenceSection from '@components/settings/PreferenceSection';
import TopicSelector from '@components/settings/TopicSelector';
import RegionSelector from '@components/settings/RegionSelector';
import TimePickerModal from '@components/settings/TimePickerModal';
import NotificationToggle from '@components/settings/NotificationToggle';
import { setDailyDigestTime, setRegions, setTopics } from '@store/slices/preferencesSlice';
import { toggleNotifications } from '@store/slices/settingsSlice';
import { useAppDispatch, useAppSelector } from '@hooks/useRedux';

const SettingsScreen = () => {
  const dispatch = useAppDispatch();
  const { topics, regions, dailyDigestTime } = useAppSelector((state) => state.preferences);
  const { notificationsEnabled } = useAppSelector((state) => state.settings);
  const [timePickerOpen, setTimePickerOpen] = useState(false);

  const availableTopics = ['Technology', 'Business', 'Science', 'Health'];
  const availableRegions = ['US', 'EU', 'Asia', 'Africa'];

  return (
    <ScrollView style={styles.container}>
      <Header title="Settings" />
      <PreferenceSection title="Topics">
        <TopicSelector
          topics={availableTopics}
          selected={topics}
          onToggle={(topic) =>
            dispatch(
              setTopics(topics.includes(topic) ? topics.filter((t) => t !== topic) : [...topics, topic])
            )
          }
        />
      </PreferenceSection>

      <PreferenceSection title="Regions">
        <RegionSelector
          regions={availableRegions}
          selected={regions}
          onToggle={(region) =>
            dispatch(
              setRegions(
                regions.includes(region) ? regions.filter((r) => r !== region) : [...regions, region]
              )
            )
          }
        />
      </PreferenceSection>

      <PreferenceSection title="Daily digest">
        <Text onPress={() => setTimePickerOpen(true)}>
          {dailyDigestTime ? `Scheduled for ${dailyDigestTime}` : 'Set delivery time'}
        </Text>
      </PreferenceSection>

      <PreferenceSection title="Notifications">
        <NotificationToggle
          value={notificationsEnabled}
          onToggle={(value) => dispatch(toggleNotifications(value))}
        />
      </PreferenceSection>

      <TimePickerModal
        visible={timePickerOpen}
        onClose={() => setTimePickerOpen(false)}
        onConfirm={(time) => dispatch(setDailyDigestTime(time))}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 }
});

export default SettingsScreen;
