import { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { refreshAccessToken, clearTokens } from '../auth';
import networkManager from '../networkManager';
import { parseApiError, logApiError } from '../errorHandler';
import { EnhancedAxiosRequestConfig } from '../../types/api';

const shouldLog = __DEV__;

const retryWithRefreshedToken = async (
  client: AxiosInstance,
  error: AxiosError,
  config: EnhancedAxiosRequestConfig,
): Promise<AxiosResponse | never> => {
  if (config._retryAuth) {
    await clearTokens();
    return Promise.reject(error);
  }

  const newToken = await refreshAccessToken();
  if (newToken) {
    config._retryAuth = true;
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${newToken}`,
    };
    return client(config);
  }

  await clearTokens();
  return Promise.reject(error);
};

export const attachResponseInterceptor = (client: AxiosInstance) => {
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      if (shouldLog) {
        console.log('[API] Response', {
          url: response.config.url,
          status: response.status,
          correlationId: (response.config as EnhancedAxiosRequestConfig)?.meta?.correlationId,
        });
      }
      return response.data ?? response;
    },
    async (error: AxiosError) => {
      const config = error.config as EnhancedAxiosRequestConfig | undefined;
      const parsedError = parseApiError(error);

      if (parsedError.status === 401 && config) {
        return retryWithRefreshedToken(client, error, config);
      }

      if (parsedError.isOffline && config?.queueIfOffline !== false) {
        if (shouldLog) {
          console.log('[API] Offline detected, queuing failed request', config.url);
        }
        return networkManager.enqueue(config).then((nextConfig) => client(nextConfig));
      }

      logApiError(parsedError);
      return Promise.reject(parsedError);
    },
  );
};

export default attachResponseInterceptor;
