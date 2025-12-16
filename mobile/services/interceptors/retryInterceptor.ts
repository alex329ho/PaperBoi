import { AxiosError, AxiosInstance } from 'axios';
import { EnhancedAxiosRequestConfig } from '../../types/api';

const defaultRetries = 2;

export const attachRetryInterceptor = (client: AxiosInstance, options?: { retries?: number }) => {
  const maxRetry = options?.retries ?? defaultRetries;

  client.interceptors.response.use(undefined, async (error: AxiosError) => {
    const config = error.config as (EnhancedAxiosRequestConfig & { _retryCount?: number; _retry?: boolean }) | undefined;
    if (!config || config.skipRetry) {
      return Promise.reject(error);
    }

    const retryCount = config._retryCount ?? 0;
    const status = error.response?.status;
    const shouldRetry = (!status || status >= 500) && retryCount < maxRetry;

    if (shouldRetry) {
      config._retryCount = retryCount + 1;
      return client(config);
    }

    return Promise.reject(error);
  });
};

export const attach = attachRetryInterceptor;

export default { attachRetryInterceptor, attach };
