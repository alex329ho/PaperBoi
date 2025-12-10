import { AxiosError, AxiosInstance } from 'axios';
import { calculateBackoffDelay, delay } from '../../utils/retry';
import { EnhancedAxiosRequestConfig } from '../../types/api';

const MAX_RETRIES = 5;

const shouldRetryRequest = (error: AxiosError) => {
  const status = error.response?.status;
  const retriableStatus = status && (status === 429 || (status >= 500 && status < 600));
  const isNetworkError = !status && error.code !== 'ECONNABORTED';
  return retriableStatus || isNetworkError;
};

export const attachRetryInterceptor = (client: AxiosInstance) => {
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as EnhancedAxiosRequestConfig | undefined;
      if (!config || config._retryCount >= MAX_RETRIES || config.skipRetry) {
        return Promise.reject(error);
      }

      if (!shouldRetryRequest(error)) {
        return Promise.reject(error);
      }

      const retryCount = (config._retryCount || 0) + 1;
      const backoffDelay = calculateBackoffDelay(retryCount);
      config._retryCount = retryCount;

      await delay(backoffDelay);
      return client(config as EnhancedAxiosRequestConfig);
    }
  );
};

export default attachRetryInterceptor;
