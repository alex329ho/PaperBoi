import { useCallback, useEffect, useRef, useState } from 'react';

interface AsyncState<T> {
  data: T | null;
  error: unknown;
  loading: boolean;
}

/**
 * Simple hook to load async data with cancellation support.
 */
export const useAsyncData = <T>(
  fetcher: (signal?: AbortSignal) => Promise<T>,
  deps: any[] = [],
) => {
  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, loading: false });
  const abortController = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortController.current?.abort();
    abortController.current = new AbortController();

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const result = await fetcher(abortController.current.signal);
      setState({ data: result, error: null, loading: false });
      return result;
    } catch (error) {
      setState((prev) => ({ ...prev, error, loading: false }));
      throw error;
    }
  }, deps);

  useEffect(() => {
    load();
    return () => abortController.current?.abort();
  }, [load]);

  return { ...state, refresh: load } as const;
};

export default useAsyncData;
