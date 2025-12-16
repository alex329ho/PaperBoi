import { AxiosError, AxiosResponse } from 'axios';
import endpoints from '../endpoints';
import AsyncStorage from '@react-native-async-storage/async-storage';
import networkManager from '../networkManager';

const ACCESS_TOKEN_KEY = 'pb_access_token';
const REFRESH_TOKEN_KEY = 'pb_refresh_token';

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function refreshToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) return refreshPromise;
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refresh = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refresh) return null;

      // Use global axios instance to call refresh; import lazily to avoid circular imports
      // eslint-disable-next-line global-require
      const axios = require('axios');
      const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.paperboi.app';
      const resp = await axios.post(`${baseURL}${endpoints.auth.refresh}`, { refreshToken: refresh }, { timeout: 10000 });
      const newAccess = resp?.data?.accessToken || null;
      if (newAccess) await AsyncStorage.setItem(ACCESS_TOKEN_KEY, newAccess);
      return newAccess;
    } catch (err) {
      await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
      await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
      return null;
    } finally {
      isRefreshing = false;
    }
  })();
  return refreshPromise;
}

const onFulfilled = (response: AxiosResponse) => {
  if (__DEV__) console.debug('[API] Response:', response.config.method, response.config.url, response.status);
  // Transform response data if API wraps payload
  return response;
};

const onRejected = async (error: AxiosError) => {
  const originalRequest = error.config as any;

  // Network offline handling: queue request and return rejected promise
  if (!networkManager.isOnline()) {
    // Queue request for later replay; non-critical requests may be queued by caller as well
    networkManager.queueRequest(originalRequest);
    return Promise.reject({ message: 'offline', isOffline: true, originalError: error });
  }

  const status = error.response?.status;

  // 401 -> try refresh flow
  if (status === 401 && !originalRequest._retry) {
    originalRequest._retry = true;
    const newToken = await refreshToken();
    if (newToken) {
      originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
      // eslint-disable-next-line global-require
      const { axiosInstance } = require('../api');
      return axiosInstance.request(originalRequest);
    }
    // If refresh failed, fallthrough to reject so app clears auth
  }

  // 429 Too Many Requests: attach hint that retry interceptor should handle backoff
  if (status === 429) {
    return Promise.reject(Object.assign(error, { isRateLimit: true }));
  }

  // For 5xx errors, mark as transient
  if (status && status >= 500 && status < 600) {
    return Promise.reject(Object.assign(error, { isServerError: true }));
  }

  // Default reject
  return Promise.reject(error);
};

export default { onFulfilled, onRejected };
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
