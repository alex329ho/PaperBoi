import { renderHook, waitFor } from '@testing-library/react-native';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

jest.mock('@react-native-community/netinfo', () => {
  const listeners: any[] = [];
  const state = { isConnected: true, isInternetReachable: true } as any;
  return {
    __esModule: true,
    default: {
      addEventListener: jest.fn((listener: any) => {
        listeners.push(listener);
        listener(state);
        return { remove: jest.fn() } as any;
      }),
      fetch: jest.fn(() => Promise.resolve(state)),
    },
  };
});

describe('useNetworkStatus', () => {
  it('subscribes to network changes and returns status', async () => {
    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => expect(result.current?.isConnected).toBe(true));
  });
});
