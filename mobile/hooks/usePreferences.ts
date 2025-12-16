import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppDispatch, useAppSelector } from './useRedux';
import {
  PreferencesState,
  setDigestTime,
  setEmailFrequency,
  setLanguages,
  setRegions,
  setSummaryLength,
  setTopics,
  toggleEmail,
  toggleNotifications,
} from '../store/slices/preferencesSlice';
import { useTheme } from './useTheme';

const PREFERENCES_KEY = 'paperboi_preferences';

export const usePreferences = () => {
  const dispatch = useAppDispatch();
  const preferences = useAppSelector((state) => state.preferences);
  const { mode, toggleTheme } = useTheme();
  const [persisted, setPersisted] = useState<PreferencesState | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem(PREFERENCES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as PreferencesState;
        setPersisted(parsed);
        dispatch(setTopics(parsed.topics));
        dispatch(setRegions(parsed.regions));
        dispatch(setLanguages(parsed.languages));
        dispatch(setDigestTime(parsed.digestTime));
        dispatch(toggleNotifications(parsed.notificationsEnabled));
        dispatch(toggleEmail(parsed.emailEnabled));
        dispatch(setEmailFrequency(parsed.emailFrequency));
        dispatch(setSummaryLength(parsed.summaryLength));
      }
    };
    load();
  }, [dispatch]);

  const savePreferences = useCallback(
    async (values: PreferencesState) => {
      setSaving(true);
      setStatus('idle');
      try {
        await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(values));
        dispatch(setTopics(values.topics));
        dispatch(setRegions(values.regions));
        dispatch(setLanguages(values.languages));
        dispatch(setDigestTime(values.digestTime));
        dispatch(toggleNotifications(values.notificationsEnabled));
        dispatch(toggleEmail(values.emailEnabled));
        dispatch(setEmailFrequency(values.emailFrequency));
        dispatch(setSummaryLength(values.summaryLength));
        setPersisted(values);
        setStatus('success');
      } catch (error) {
        setStatus('error');
      } finally {
        setSaving(false);
      }
    },
    [dispatch],
  );

  const hydratedPreferences = useMemo(
    () => ({ ...preferences, ...(persisted ?? {}) }),
    [persisted, preferences],
  );

  return {
    preferences: hydratedPreferences,
    mode,
    toggleTheme,
    savePreferences,
    saving,
    status,
  } as const;
};

export default usePreferences;
