import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  Button,
  HelperText,
  SegmentedButtons,
  Switch,
  Text,
  TextInput,
  Chip,
} from 'react-native-paper';
import { PreferencesState } from '../../store/slices/preferencesSlice';
import TimePickerModal from './TimePickerModal';

interface PreferenceFormProps {
  initialValues: PreferencesState;
  onSave: (values: PreferencesState) => Promise<void> | void;
  loading?: boolean;
}

const topicOptions = ['Technology', 'Business', 'Sports', 'Health', 'Science', 'Entertainment'];
const regionOptions = ['US', 'Europe', 'Asia', 'Africa', 'Latin America', 'Global'];
const languageOptions = ['en', 'es', 'fr', 'de', 'hi', 'zh'];

const PreferenceForm: React.FC<PreferenceFormProps> = ({ initialValues, onSave, loading }) => {
  const [values, setValues] = useState<PreferencesState>(initialValues);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const toggleMultiValue = (key: 'topics' | 'regions' | 'languages', item: string) => {
    setValues((prev) => {
      const next = prev[key].includes(item)
        ? prev[key].filter((entry) => entry !== item)
        : [...prev[key], item];
      return { ...prev, [key]: next };
    });
  };

  const handleSave = async () => {
    if (!values.topics.length) {
      setError('Select at least one topic to personalize your feed.');
      return;
    }
    setError(undefined);
    await onSave(values);
  };

  const digestLabel = useMemo(() => values.digestTime || '08:00', [values.digestTime]);

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text>Push notifications</Text>
        <Switch
          accessibilityLabel="Toggle push notifications"
          value={values.notificationsEnabled}
          onValueChange={(checked) =>
            setValues((prev) => ({ ...prev, notificationsEnabled: checked }))
          }
        />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text>Email updates</Text>
        <Switch
          accessibilityLabel="Toggle email updates"
          value={values.emailEnabled}
          onValueChange={(checked) => setValues((prev) => ({ ...prev, emailEnabled: checked }))}
        />
      </View>
      {values.emailEnabled ? (
        <SegmentedButtons
          value={values.emailFrequency}
          onValueChange={(value) =>
            setValues((prev) => ({
              ...prev,
              emailFrequency: value as PreferencesState['emailFrequency'],
            }))
          }
          buttons={[
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
          ]}
        />
      ) : null}
      <SegmentedButtons
        value={values.summaryLength}
        onValueChange={(value) =>
          setValues((prev) => ({
            ...prev,
            summaryLength: value as PreferencesState['summaryLength'],
          }))
        }
        buttons={[
          { value: 'short', label: 'Short' },
          { value: 'medium', label: 'Medium' },
          { value: 'long', label: 'Long' },
        ]}
      />
      <TimePickerModal
        value={digestLabel}
        onChange={(time) => setValues((prev) => ({ ...prev, digestTime: time }))}
      />

      <View>
        <Text variant="titleMedium" accessibilityRole="header">
          Topics
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {topicOptions.map((topic) => (
            <Chip
              key={topic}
              selected={values.topics.includes(topic)}
              onPress={() => toggleMultiValue('topics', topic)}
            >
              {topic}
            </Chip>
          ))}
        </View>
        <HelperText type={values.topics.length ? 'info' : 'error'} visible>
          {values.topics.length
            ? 'Tailor your feed with topics you love.'
            : 'Please select at least one topic.'}
        </HelperText>
      </View>

      <View>
        <Text variant="titleMedium" accessibilityRole="header">
          Regions
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {regionOptions.map((region) => (
            <Chip
              key={region}
              selected={values.regions.includes(region)}
              onPress={() => toggleMultiValue('regions', region)}
            >
              {region}
            </Chip>
          ))}
        </View>
      </View>

      <View>
        <Text variant="titleMedium" accessibilityRole="header">
          Languages
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {languageOptions.map((lang) => (
            <Chip
              key={lang}
              selected={values.languages.includes(lang)}
              onPress={() => toggleMultiValue('languages', lang)}
            >
              {lang.toUpperCase()}
            </Chip>
          ))}
        </View>
      </View>

      <TextInput
        label="Preferred region keywords"
        value={values.regions.join(', ')}
        onChangeText={(text) =>
          setValues((prev) => ({
            ...prev,
            regions: text
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean),
          }))
        }
        accessibilityLabel="Region preference input"
      />

      {error ? <HelperText type="error">{error}</HelperText> : null}

      <Button
        mode="contained"
        onPress={handleSave}
        loading={loading}
        disabled={loading}
        accessibilityLabel="Save settings"
      >
        Save preferences
      </Button>
    </View>
  );
};

export default PreferenceForm;
