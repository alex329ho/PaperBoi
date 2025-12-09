import axios from 'axios';
import Constants from 'expo-constants';
import { API_TIMEOUT } from '@utils/constants';
import { API_BASE_URL } from '@env';

const baseURL = API_BASE_URL || Constants.expoConfig?.extra?.apiBaseUrl || 'https://api.paperboi.dev';

const api = axios.create({
  baseURL,
  timeout: API_TIMEOUT
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Add shared error handling/logging here
    return Promise.reject(error);
  }
);

export default api;
