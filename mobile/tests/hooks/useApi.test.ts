import { renderHook, act } from '@testing-library/react-native';
import { useApi } from '../../hooks/useApi';

describe('useApi', () => {
  it('returns data on success', async () => {
    const { result } = renderHook(() => useApi(async () => 'ok'));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.data).toBe('ok');
  });
});
