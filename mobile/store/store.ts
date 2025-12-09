import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import persistConfig from './persistConfig';
import authReducer from './slices/authSlice';
import newsReducer from './slices/newsSlice';
import preferencesReducer from './slices/preferencesSlice';
import uiReducer from './slices/uiSlice';
import settingsReducer from './slices/settingsSlice';
import analyticsMiddleware from './middleware/analyticsMiddleware';
import errorMiddleware from './middleware/errorMiddleware';

const rootReducer = combineReducers({
  auth: authReducer,
  news: newsReducer,
  preferences: preferencesReducer,
  ui: uiReducer,
  settings: settingsReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(analyticsMiddleware, errorMiddleware),
  devTools: process.env.NODE_ENV !== 'production',
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
