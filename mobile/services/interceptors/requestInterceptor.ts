import { AxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

// Token storage keys - adjust to your app's keys
const ACCESS_TOKEN_KEY = 'pb_access_token';

async function getToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  } catch (e) {
    return null;
  }
}

function addTimestamp(config: AxiosRequestConfig) {
  config.headers = config.headers || {};
  config.headers['X-Request-Timestamp'] = new Date().toISOString();
}

const onFulfilled = async (config: AxiosRequestConfig) => {
  // Add Authorization header if token exists
  const token = await getToken();
  config.headers = config.headers || {};

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  // Add correlation id for tracing
  if (!config.headers['X-Correlation-ID']) {
    config.headers['X-Correlation-ID'] = uuidv4();
  }

  // Platform header (reliable fallback)
  config.headers['X-Platform'] = Platform.OS;

  addTimestamp(config);

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.debug('[API] Request:', config.method, config.url, config.params || config.data);
  }

  // Basic validation: ensure URL present
  if (!config.url) throw new Error('Invalid request: missing URL');

  return config;
};

const onRejected = (error: any) => {
  if (__DEV__) console.warn('[API] Request error', error?.message || error);
  return Promise.reject(error);
};

export default { onFulfilled, onRejected };
import { AxiosInstance } from 'axios';
import { Platform } from 'react-native';
import { getAuthToken } from '../auth';
import networkManager from '../networkManager';
import { createCorrelationId, buildDeduplicationKey } from '../../utils/retry';
import { EnhancedAxiosRequestConfig } from '../../types/api';

const shouldLog = __DEV__;

export const attachRequestInterceptor = (client: AxiosInstance) => {
  client.interceptors.request.use(async (config: EnhancedAxiosRequestConfig) => {
    const updatedConfig = { ...config } as EnhancedAxiosRequestConfig;
    const token = await getAuthToken();

    updatedConfig.headers = {
      ...updatedConfig.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Request-Timestamp': new Date().toISOString(),
      'X-Correlation-ID': updatedConfig.headers?.['X-Correlation-ID'] || createCorrelationId(),
      'X-Device-Platform': Platform.OS,
    };

    if (updatedConfig.timeoutMs) {
      updatedConfig.timeout = updatedConfig.timeoutMs;
    }

    updatedConfig.meta = {
      ...updatedConfig.meta,
      correlationId: updatedConfig.headers['X-Correlation-ID'] as string,
      timestamp: Date.now(),
    };

    const isOnline = await networkManager.isOnline();
    updatedConfig.meta.dedupeKey = buildDeduplicationKey(updatedConfig);

    if (!isOnline && updatedConfig.queueIfOffline !== false) {
      if (shouldLog) {
        console.log('[API] Queuing request while offline', updatedConfig.url);
      }
      return networkManager.enqueue(updatedConfig);
    }

    if (shouldLog) {
      console.log('[API] Request', {
        url: updatedConfig.url,
        method: updatedConfig.method,
        params: updatedConfig.params,
        data: updatedConfig.data,
        correlationId: updatedConfig.meta?.correlationId,
      });
    }

    return updatedConfig;
  });
};

export default attachRequestInterceptor;
