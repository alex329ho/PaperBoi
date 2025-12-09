import NetInfo from '@react-native-community/netinfo';
import { renderHook } from '@testing-library/react-hooks';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

jest.mock('@react-native-community/netinfo');

const mockedNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

mockedNetInfo.addEventListener = jest.fn(() => () => {});
mockedNetInfo.fetch = jest.fn().mockResolvedValue({ isConnected: true } as any);

describe('useNetworkStatus', () => {
  it('subscribes to network changes', () => {
    renderHook(() => useNetworkStatus());
    expect(mockedNetInfo.addEventListener).toHaveBeenCalled();
  });
});
