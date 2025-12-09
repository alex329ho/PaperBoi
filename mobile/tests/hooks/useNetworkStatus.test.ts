import { renderHook, waitFor } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import { useNetworkStatus } from '@hooks/useNetworkStatus';

describe('useNetworkStatus', () => {
  it('defaults to online', async () => {
    const listener = jest.spyOn(NetInfo, 'addEventListener').mockImplementation((cb) => {
      cb({ isConnected: true } as any);
      return () => {};
    });

    const { result } = renderHook(() => useNetworkStatus());
    await waitFor(() => expect(result.current.isOnline).toBe(true));
    listener.mockRestore();
  });
});
