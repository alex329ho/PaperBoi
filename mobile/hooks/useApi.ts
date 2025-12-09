import { useCallback, useState } from 'react';
import api from '@services/api';

interface ApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export const useApi = <T,>(endpoint: string) => {
  const [state, setState] = useState<ApiState<T>>({ data: null, error: null, loading: false });

  const request = useCallback(
    async (config?: object) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const response = await api.get<T>(endpoint, config);
        setState({ data: response.data, error: null, loading: false });
        return response.data;
      } catch (error) {
        const message = (error as Error).message;
        setState({ data: null, error: message, loading: false });
        throw error;
      }
    },
    [endpoint]
  );

  return { ...state, request };
};
