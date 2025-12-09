import { useCallback, useState } from 'react';
import axios from 'axios';

export const useApi = <T,>(request: () => Promise<T>) => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const execute = useCallback(async () => {
    try {
      setLoading(true);
      const response = await request();
      setData(response);
      setError(null);
      return response;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.message);
      } else {
        setError('Unexpected error');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [request]);

  return { execute, data, error, loading };
};
