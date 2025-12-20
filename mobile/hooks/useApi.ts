import { useCallback, useEffect, useRef, useState } from 'react';
import { AxiosRequestConfig } from 'axios';
import apiClient from '../services/api';
import { parseApiError } from '../services/errorHandler';
import { ApiError } from '../types/api';

export interface UseApiState<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
}

export const useApi = <T>(
  requestFactory: (signal: AbortSignal) => Promise<T>,
  options?: AxiosRequestConfig,
) => {
  const [state, setState] = useState<UseApiState<T>>({ data: null, error: null, loading: false });
  const abortController = useRef<AbortController | null>(null);

  const execute = useCallback(
    async (_overrideConfig?: AxiosRequestConfig) => {
      abortController.current?.abort();
      abortController.current = new AbortController();

      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const result = await requestFactory(abortController.current.signal);
        setState({ data: result, error: null, loading: false });
        return result;
      } catch (error) {
        const parsedError = parseApiError(error);
        setState((prev) => ({ ...prev, error: parsedError, loading: false }));
        throw parsedError;
      }
    },
    [requestFactory],
  );

  useEffect(() => () => abortController.current?.abort(), []);

  return { ...state, execute, client: apiClient, config: options };
};

export default useApi;
