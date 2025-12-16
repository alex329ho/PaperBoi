import { act, renderHook } from '@testing-library/react-native';
import { useApi } from '../../hooks/useApi';

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {},
}));

describe('useApi', () => {
  it('returns data on success', async () => {
    const { result } = renderHook(() => useApi(async () => 'ok'));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.data).toBe('ok');
    expect(result.current.error).toBeNull();
  });

  it('captures errors and surfaces parsed error', async () => {
    const { result } = renderHook(() =>
      useApi(async () => {
        throw new Error('boom');
      }),
    );

    await act(async () => {
      await expect(result.current.execute()).rejects.toBeDefined();
    });

    expect(result.current.error?.message).toContain('boom');
  });
});
