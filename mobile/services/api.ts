import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Platform } from 'react-native';
import requestInterceptor from './interceptors/requestInterceptor';
import responseInterceptor from './interceptors/responseInterceptor';
import retryInterceptor from './interceptors/retryInterceptor';
import endpoints from './endpoints';

// Minimal APP_VERSION fallback. Projects can import from app.json or env.
const APP_VERSION = '1.0.0';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.paperboi.app';

const axiosInstance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Version': APP_VERSION,
    'X-Platform': Platform.OS,
  },
});

// Register interceptors (order matters)
axiosInstance.interceptors.request.use(requestInterceptor.onFulfilled, requestInterceptor.onRejected);
axiosInstance.interceptors.response.use(responseInterceptor.onFulfilled, responseInterceptor.onRejected);

// Retry interceptor is applied last to catch transient failures
retryInterceptor.attach(axiosInstance);

// Helper wrapper that supports AbortController and per-request timeout
export type ApiOptions = AxiosRequestConfig & { timeoutMs?: number };

export async function apiRequest<T = any>(config: ApiOptions, signal?: AbortSignal): Promise<AxiosResponse<T>> {
  const source = axios.CancelToken.source();

  if (signal) {
    if (signal.aborted) source.cancel('aborted');
    const onAbort = () => source.cancel('aborted');
    signal.addEventListener('abort', onAbort, { once: true });
    try {
      const resp = await axiosInstance.request<T>({ ...config, cancelToken: source.token });
      return resp;
    } finally {
      signal.removeEventListener('abort', () => source.cancel('aborted'));
    }
  }

  return axiosInstance.request<T>({ ...config });
}

export { axiosInstance, endpoints };
import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { attachRequestInterceptor } from './interceptors/requestInterceptor';
import { attachResponseInterceptor } from './interceptors/responseInterceptor';
import { attachRetryInterceptor } from './interceptors/retryInterceptor';
import networkManager from './networkManager';
import { API_ENDPOINTS } from './endpoints';
import { ApiResponse, NewsArticle, Preference } from '../types/api';

const APP_VERSION =
  Constants.expoConfig?.version ||
  Constants.manifest?.version ||
  Constants.expoConfig?.extra?.appVersion ||
  'dev';

export const apiClient = axios.create({
  baseURL: Constants.expoConfig?.extra?.apiBaseUrl || process.env.EXPO_PUBLIC_API_BASE_URL,
  timeout: Number(process.env.EXPO_PUBLIC_API_TIMEOUT) || 30000,
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Version': APP_VERSION,
    'X-Platform': Platform.OS,
  },
});

networkManager.registerClient(apiClient);
attachRequestInterceptor(apiClient);
attachRetryInterceptor(apiClient);
attachResponseInterceptor(apiClient);

export default apiClient;

export const fetchNews = async (filters?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<NewsArticle[]>>(API_ENDPOINTS.news.list, { params: filters });

export const getArticleById = async (id: string | number) =>
  apiClient.get<ApiResponse<NewsArticle>>(API_ENDPOINTS.news.detail(id));

export const searchArticles = async (query: Record<string, unknown>) =>
  apiClient.post<ApiResponse<NewsArticle[]>>(API_ENDPOINTS.news.search, query);

export const getTrendingTopics = async () =>
  apiClient.get<ApiResponse<string[]>>(API_ENDPOINTS.news.trending);

export const getPreferences = async () =>
  apiClient.get<ApiResponse<Preference>>(API_ENDPOINTS.preferences.base);

export const updatePreferences = async (payload: Partial<Preference>) =>
  apiClient.put<ApiResponse<Preference>>(API_ENDPOINTS.preferences.update, payload);

export const updateTopics = async (topics: string[]) =>
  apiClient.post<ApiResponse<Preference>>(API_ENDPOINTS.preferences.topics, { topics });

export const sendEmailSummary = async (payload: { range: string }) =>
  apiClient.post<ApiResponse<{ status: string }>>(API_ENDPOINTS.email.sendSummary, payload);

export const getEmailHistory = async () =>
  apiClient.get<ApiResponse<any[]>>(API_ENDPOINTS.email.history);

// Backwards compatibility for existing code paths
export const fetchTopStories = async () => {
  const response = await fetchNews({ category: 'top' });
  return (response as ApiResponse<NewsArticle[]>).data;
};
