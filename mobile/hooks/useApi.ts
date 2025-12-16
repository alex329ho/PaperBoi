import { useState, useCallback, useRef, useEffect } from 'react';
import { apiRequest, axiosInstance } from '../services/api';
import { AxiosRequestConfig, AxiosResponse } from 'axios';

type UseApiResult<T> = {
  loading: boolean;
  error: any | null;
  data: T | null;
  call: (config: AxiosRequestConfig, opts?: { signal?: AbortSignal }) => Promise<AxiosResponse<T> | null>;
  cancel: () => void;
};

export function useApi<T = any>(): UseApiResult<T> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any | null>(null);
  const [data, setData] = useState<T | null>(null);
  const abortCtrl = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortCtrl.current) abortCtrl.current.abort();
    };
  }, []);

  const call = useCallback(async (config: AxiosRequestConfig, opts?: { signal?: AbortSignal }) => {
    setLoading(true);
    setError(null);
    abortCtrl.current = new AbortController();
    const signal = opts?.signal || abortCtrl.current.signal;
    try {
      const resp = await apiRequest<T>({ ...config }, signal);
      setData(resp.data as T);
      return resp;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancel = useCallback(() => {
    if (abortCtrl.current) abortCtrl.current.abort();
  }, []);

  return { loading, error, data, call, cancel };
}
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
        const parsedError = parseApiError(error as any);
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
