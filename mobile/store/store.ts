import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import analyticsMiddleware from './middleware/analyticsMiddleware';
import syncMiddleware from './middleware/syncMiddleware';
import authReducer from './slices/authSlice';
import newsReducer from './slices/newsSlice';
import preferencesReducer from './slices/preferencesSlice';
import syncReducer from './slices/syncSlice';
import uiReducer from './slices/uiSlice';
import persistConfig from './persistConfig';
const rootReducer = combineReducers({
  auth: authReducer,
  news: newsReducer,
  preferences: preferencesReducer,
  ui: uiReducer,
  sync: syncReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
      thunk: true,
    })
      .prepend(syncMiddleware)
      .concat(analyticsMiddleware),
  devTools: process.env.NODE_ENV !== 'production',
});

export const persistor = persistStore(store);

export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;
export type RootState = ReturnType<typeof store.getState>;
export type StoreRootState = RootState;
export type StoreDispatch = typeof store.dispatch;
export type StoreGetState = typeof store.getState;

export default store;
