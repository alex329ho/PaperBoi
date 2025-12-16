import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { computeBackoffDelay } from '../../utils/retry';

type RetryOptions = {
  retries?: number;
  retryCondition?: (err: any) => boolean;
};

const DEFAULTS: Required<RetryOptions> = {
  retries: 5,
  retryCondition: (err: any) => {
    // Retry on network error, timeouts, 5xx and rate-limited responses
    if (!err) return false;
    if (err.code === 'ECONNABORTED' || err.message === 'Network Error') return true;
    if (err.isRateLimit) return true;
    if (err.isServerError) return true;
    const status = err.response?.status;
    if (status && status >= 500) return true;
    return false;
  },
};

function attach(instance: AxiosInstance, opts: RetryOptions = {}) {
  const options = { ...DEFAULTS, ...opts } as Required<RetryOptions>;

  instance.interceptors.response.use(
    (r: AxiosResponse) => r,
    async (error: any) => {
      const config: AxiosRequestConfig & { __retryCount?: number } = error.config || {};
      if (!config || !options.retryCondition(error)) return Promise.reject(error);

      config.__retryCount = config.__retryCount || 0;
      if (config.__retryCount >= options.retries) return Promise.reject(error);

      config.__retryCount += 1;
      const delay = computeBackoffDelay(config.__retryCount);
      if (typeof delay === 'number') await new Promise((res) => setTimeout(res, delay));

      // Re-dispatch request
      return instance.request(config);
    }
  );
}

export default { attach };
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
    },
  );
};

export default attachRetryInterceptor;
