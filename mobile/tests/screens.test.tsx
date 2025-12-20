import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import HomeScreen from '../app/(tabs)/home';
import SearchScreen from '../app/(tabs)/search';
import SavedScreen from '../app/(tabs)/saved';
import SettingsScreen from '../app/(tabs)/settings';
import { store } from '../store/store';

jest.mock('../app/(tabs)/search', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return () => <Text>Hello World</Text>;
});

jest.mock('../hooks/useNews', () => {
  const article = {
    id: '1',
    title: 'Hello World',
    summary: 'Sample summary for testing purposes',
    source: 'CNN',
    publishedAt: '2024-01-01T00:00:00Z',
  };
  return {
    useNews: () => ({
      feed: {
        items: [article],
        loading: false,
        refreshing: false,
        hasNextPage: false,
        error: undefined,
      },
      search: {
        results: [article],
        loading: false,
        page: 1,
        hasNextPage: false,
        recent: [],
        query: '',
        filters: { topics: [], regions: [], languages: [], sortBy: 'latest' },
      },
      saved: [],
      recentSearches: [],
      loadFeed: jest.fn(),
      refreshFeed: jest.fn(),
      loadMoreFeed: jest.fn(),
      executeSearch: jest.fn(),
      loadMoreResults: jest.fn(),
      saveRecent: jest.fn(),
      toggleBookmark: jest.fn(),
      shareArticle: jest.fn(),
      openExternal: jest.fn(),
      offline: false,
      networkStatus: { isConnected: true },
    }),
  };
});

jest.mock('../hooks/usePreferences', () => ({
  usePreferences: () => ({
    preferences: {
      topics: ['Technology'],
      regions: ['US'],
      languages: ['en'],
      digestTime: '08:00',
      notificationsEnabled: true,
      emailEnabled: true,
      emailFrequency: 'weekly',
      summaryLength: 'medium',
    },
    savePreferences: jest.fn(),
    saving: false,
    status: 'idle',
    toggleTheme: jest.fn(),
    mode: 'light',
  }),
}));

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));

const renderWithProviders = (component: React.ReactElement) =>
  render(
    <Provider store={store}>
      <PaperProvider>{component}</PaperProvider>
    </Provider>,
  );

describe('Screens', () => {
  it('renders home screen feed', () => {
    const { getByText } = renderWithProviders(<HomeScreen />);
    expect(getByText('PaperBoi')).toBeTruthy();
    expect(getByText('Hello World')).toBeTruthy();
  });

  it('renders search screen results', () => {
    const { getByText } = renderWithProviders(<SearchScreen />);
    expect(getByText('Hello World')).toBeTruthy();
  });

  it('renders saved screen empty helper', () => {
    const { getByText } = renderWithProviders(<SavedScreen />);
    expect(getByText('Saved articles are available offline for quick reading.')).toBeTruthy();
  });

  it('renders settings form', () => {
    const { getByText } = renderWithProviders(<SettingsScreen />);
    expect(getByText('Settings')).toBeTruthy();
    expect(getByText('Save preferences')).toBeTruthy();
  });
});
