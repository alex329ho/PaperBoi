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

    if (updatedConfig.queueIfOffline) {
      const isOnline = await networkManager.isOnline();
      if (!isOnline) {
        if (shouldLog) {
          console.log('[API] Queuing request while offline', updatedConfig.url);
        }
        return networkManager.queueRequest(updatedConfig);
      }
    }

    if (updatedConfig.allowDeduplication !== false) {
      updatedConfig.meta = {
        ...updatedConfig.meta,
        dedupeKey: updatedConfig.meta?.dedupeKey || buildDeduplicationKey(updatedConfig),
      };
    }

    if (shouldLog) {
      console.log('[API] Request', updatedConfig.method, updatedConfig.url, updatedConfig.params || updatedConfig.data);
    }

    return updatedConfig;
  });
};

export default { attachRequestInterceptor };
