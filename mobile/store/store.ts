import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import { persistReducer, persistStore } from 'redux-persist';
import thunk from 'redux-thunk';
import { persistConfig } from './persistConfig';
import authReducer from './slices/authSlice';
import newsReducer from './slices/newsSlice';
import preferencesReducer from './slices/preferencesSlice';
import settingsReducer from './slices/settingsSlice';
import uiReducer from './slices/uiSlice';
import analyticsMiddleware from './middleware/analyticsMiddleware';
import errorMiddleware from './middleware/errorMiddleware';

const rootReducer = {
  auth: authReducer,
  news: newsReducer,
  preferences: preferencesReducer,
  settings: settingsReducer,
  ui: uiReducer
};

const persistedReducer = persistReducer(persistConfig, combineReducers(rootReducer));

function combineReducers(reducers: typeof rootReducer) {
  return (state: any, action: any) => {
    const newState: any = {};
    Object.keys(reducers).forEach((key) => {
      const reducer = (reducers as any)[key];
      newState[key] = reducer(state?.[key], action);
    });
    return newState;
  };
}

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false, thunk: false }).concat(
      thunk,
      analyticsMiddleware,
      errorMiddleware
    ),
  devTools: true
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: typeof useSelector = useSelector;
