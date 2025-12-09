import api from './api';
import { endpoints } from './endpoints';
import { PreferencesState } from '@store/slices/preferencesSlice';

export const fetchPreferences = async () => {
  const response = await api.get<PreferencesState>(endpoints.preferences);
  return response.data;
};

export const updatePreferences = async (payload: PreferencesState) => {
  const response = await api.post<PreferencesState>(endpoints.preferences, payload);
  return response.data;
};
