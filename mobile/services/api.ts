import axios from 'axios';
import Constants from 'expo-constants';
import { getAuthToken } from './auth';
import { API_ENDPOINTS } from './endpoints';

const api = axios.create({
  baseURL: Constants.expoConfig?.extra?.apiBaseUrl || process.env.EXPO_PUBLIC_API_BASE_URL,
  timeout: Number(process.env.EXPO_PUBLIC_API_TIMEOUT) || 30000,
});

api.interceptors.request.use(async (config) => {
  const token = await getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Future enhancement: trigger refresh token flow
    }
    return Promise.reject(error);
  }
);

export const fetchTopStories = async () => {
  const { data } = await api.get(API_ENDPOINTS.topStories);
  return data.articles;
};

export default api;
