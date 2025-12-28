import React from 'react';
import { render } from '@testing-library/react-native';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import ArticleDetail from '../app/[article_id]';
import authReducer from '../store/slices/authSlice';
import newsReducer from '../store/slices/newsSlice';
import preferencesReducer from '../store/slices/preferencesSlice';
import syncReducer from '../store/slices/syncSlice';
import uiReducer from '../store/slices/uiSlice';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ article_id: '1' }),
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

jest.mock('../hooks/useNews', () => ({
  useNews: () => ({
    saved: [],
    toggleBookmark: jest.fn(),
    shareArticle: jest.fn(),
    openExternal: jest.fn(),
  }),
}));

const buildStore = () => {
  const baseNewsState = newsReducer(undefined, { type: 'init' } as any);
  const baseFeed =
    baseNewsState.feed ?? {
      items: [],
      loading: false,
      refreshing: false,
      hasNextPage: false,
      page: 1,
      error: null,
    };
  const baseSearch =
    baseNewsState.search ?? {
      results: [],
      loading: false,
      hasNextPage: false,
      page: 1,
      query: undefined,
      error: null,
    };
  return configureStore({
    reducer: combineReducers({
      auth: authReducer,
      news: newsReducer,
      preferences: preferencesReducer,
      ui: uiReducer,
      sync: syncReducer,
    }),
    preloadedState: {
      news: {
        ...baseNewsState,
        feed: {
          ...baseFeed,
          items: [
            {
              id: 1,
              title: 'Seeded article',
              content: 'Seed content',
              topic: 'Technology',
              region: 'US',
              language: 'en',
              source: 'Seed Wire',
              createdAt: '2024-01-01T00:00:00Z',
              publishedAt: '2024-01-01T00:00:00Z',
            },
          ],
          loading: false,
          refreshing: false,
          hasNextPage: false,
          page: 1,
          error: null,
        },
        search: {
          ...baseSearch,
          results: [],
          loading: false,
          hasNextPage: false,
          page: 1,
          query: undefined,
          error: null,
        },
      },
    } as any,
  });
};

describe('ArticleDetail', () => {
  it('renders article details when id types differ', () => {
    const store = buildStore();
    const { getByText, queryByText } = render(
      <Provider store={store}>
        <PaperProvider>
          <ArticleDetail />
        </PaperProvider>
      </Provider>,
    );

    expect(getByText('Seeded article')).toBeTruthy();
    expect(queryByText('Article not found. Try refreshing.')).toBeNull();
  });
});
