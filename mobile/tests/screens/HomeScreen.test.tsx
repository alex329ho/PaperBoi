import React from 'react';
import { render } from '@testing-library/react-native';
import HomeScreen from '@app/(tabs)/home';
import { Provider } from 'react-redux';
import { store } from '@store/store';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

const renderWithProviders = (ui: React.ReactElement) => render(<Provider store={store}>{ui}</Provider>);

describe('HomeScreen', () => {
  it('renders header', () => {
    const { getByText } = renderWithProviders(<HomeScreen />);
    expect(getByText('Top Stories')).toBeTruthy();
  });
});
