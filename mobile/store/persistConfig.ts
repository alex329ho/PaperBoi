import AsyncStorage from '@react-native-async-storage/async-storage';
import { PersistConfig } from 'redux-persist';
import { RootState } from './store';

type PersistableKeys = keyof RootState;

export const persistConfig: PersistConfig<RootState> = {
  key: 'paperboi-root',
  version: 1,
  storage: AsyncStorage,
  whitelist: ['auth', 'preferences', 'settings'] as PersistableKeys[],
  timeout: 5000
};
