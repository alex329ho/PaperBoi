import { renderHook, waitFor } from '@testing-library/react-native';
import api from '@services/api';
import { useApi } from '@hooks/useApi';

jest.mock('@services/api');

const mockedApi = api as jest.Mocked<typeof api>;

describe('useApi', () => {
  it('fetches data', async () => {
    mockedApi.get = jest.fn().mockResolvedValue({ data: { message: 'ok' } });
    const { result } = renderHook(() => useApi<{ message: string }>('/test'));

    result.current.request();

    await waitFor(() => expect(result.current.data).toEqual({ message: 'ok' }));
  });
});
