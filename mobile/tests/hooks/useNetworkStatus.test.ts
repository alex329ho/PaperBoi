import NetInfo from '@react-native-community/netinfo';
import { renderHook } from '@testing-library/react-native';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

jest.mock('@react-native-community/netinfo');

const mockedNetInfo = NetInfo as any;

mockedNetInfo.addEventListener = jest.fn((listener: any) => {
  listener({ isConnected: true } as any);
  return { remove: jest.fn() } as any;
});
mockedNetInfo.fetch = jest.fn(() => Promise.resolve({ isConnected: true } as any));

describe('useNetworkStatus', () => {
  it('subscribes to network changes', () => {
    renderHook(() => useNetworkStatus());
    expect(mockedNetInfo.addEventListener).toHaveBeenCalled();
  });
});
