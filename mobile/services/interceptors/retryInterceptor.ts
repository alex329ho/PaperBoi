import { AxiosError, AxiosInstance } from 'axios';
import { EnhancedAxiosRequestConfig } from '../../types/api';

const defaultRetries = 2;

export const attachRetryInterceptor = (client: AxiosInstance, options?: { retries?: number }) => {
  const maxRetry = options?.retries ?? defaultRetries;

  const shouldRetryRequest = (config?: EnhancedAxiosRequestConfig & { _retryCount?: number }) => {
    if (!config || config.skipRetry) return { retry: false, config };

    const retryCount = config._retryCount ?? 0;
    const canRetry = retryCount < maxRetry;
    return { retry: canRetry, config: { ...config, _retryCount: retryCount } };
  };

  const attemptRetry = async (
    config: (EnhancedAxiosRequestConfig & { _retryCount?: number }) | undefined,
    status?: number,
  ) => {
    const { retry, config: normalizedConfig } = shouldRetryRequest(config);
    const shouldRetry = (!status || status >= 500) && retry;

    if (shouldRetry && normalizedConfig) {
      normalizedConfig._retryCount = (normalizedConfig._retryCount ?? 0) + 1;
      return client(normalizedConfig);
    }
    return null;
  };

  client.interceptors.response.use(
    async (response) => {
      const retryAttempt = await attemptRetry(response.config as any, response.status);
      return retryAttempt ?? response;
    },
    async (error: AxiosError) => {
      const retryAttempt = await attemptRetry(error.config as any, error.response?.status);
      if (retryAttempt) return retryAttempt;
      return Promise.reject(error);
    },
  );
};

export const attach = attachRetryInterceptor;

export default { attachRetryInterceptor, attach };
