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
