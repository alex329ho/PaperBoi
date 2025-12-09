import { AnyAction, Middleware } from '@reduxjs/toolkit';
import * as Notifications from 'expo-notifications';
import { toggleAnalytics } from '../slices/settingsSlice';

const analyticsMiddleware: Middleware = (storeAPI) => (next) => async (action: AnyAction) => {
  const result = next(action);
  const state = storeAPI.getState();

  if (action.type === toggleAnalytics.type && !state.settings.analyticsEnabled) {
    await Notifications.setBadgeCountAsync(0);
  }

  return result;
};

export default analyticsMiddleware;
