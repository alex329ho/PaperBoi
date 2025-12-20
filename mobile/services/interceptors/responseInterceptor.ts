import { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import networkManager from '../networkManager';
import { EnhancedAxiosRequestConfig } from '../../types/api';

const shouldLog = __DEV__;

const handleResponse = (response: AxiosResponse) => {
  if (shouldLog) {
    console.log('[API] Response', response.config.method, response.config.url, response.status);
  }
  return response;
};

const handleError = async (error: AxiosError) => {
  const originalRequest =
    error.config as (EnhancedAxiosRequestConfig & { _retry?: boolean }) | undefined;

  if (!originalRequest) {
    return Promise.reject(error);
  }

  if (!error.response && originalRequest.queueIfOffline) {
    // Network issue: queue and surface offline error
    await networkManager.queueRequest(originalRequest);
    return Promise.reject({ ...error, isOffline: true });
  }

  if (error.response?.status === 401 && !originalRequest._retry) {
    originalRequest._retry = true;
    const client = networkManager.getClient();
    if (client) {
      return client(originalRequest);
    }
    return Promise.reject(error);
  }

  return Promise.reject(error);
};

export const attachResponseInterceptor = (client: AxiosInstance) => {
  client.interceptors.response.use(handleResponse, handleError);
};

export default { attachResponseInterceptor };
