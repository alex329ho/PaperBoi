import '@testing-library/jest-native/extend-expect';
import 'expo-router/entry';

jest.mock('expo-router', () => {
  const actual = jest.requireActual('expo-router');
  return {
    ...actual,
    useRouter: () => ({ push: jest.fn(), back: jest.fn() })
  };
});
