import AsyncStorage from '@react-native-async-storage/async-storage';
import { PersistConfig } from 'redux-persist';
import { RootState } from './store';

const persistConfig: PersistConfig<RootState> = {
  key: 'paperboi-root',
  storage: AsyncStorage,
  whitelist: ['auth', 'preferences', 'settings'],
  timeout: 0,
};

export default persistConfig;
