import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import HomeScreen from '../../app/(tabs)/home';
import { store } from '../../store/store';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('../../store/slices/newsSlice', () => ({
  ...jest.requireActual('../../store/slices/newsSlice'),
  loadTopStories: () => ({ type: 'news/loadTopStories/pending' }),
}));

describe('HomeScreen', () => {
  it('renders loading state', () => {
    const tree = render(
      <Provider store={store}>
        <HomeScreen />
      </Provider>
    );
    expect(tree.toJSON()).toBeTruthy();
  });
});
