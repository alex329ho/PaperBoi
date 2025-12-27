const API_PREFIX = '/api/v1';

const endpoints = {
  news: {
    list: `${API_PREFIX}/news`,
    detail: (id: string | number) => `${API_PREFIX}/news/${id}`,
    search: `${API_PREFIX}/news/search`,
    trending: `${API_PREFIX}/news/trending`,
    fetchFresh: `${API_PREFIX}/news/fetch-fresh`,
  },
  preferences: {
    get: `${API_PREFIX}/preferences`,
    update: `${API_PREFIX}/preferences`,
    topics: `${API_PREFIX}/preferences/topics`,
  },
  auth: {
    login: `${API_PREFIX}/auth/login`,
    register: `${API_PREFIX}/auth/register`,
    refresh: `${API_PREFIX}/auth/refresh`,
    logout: `${API_PREFIX}/auth/logout`,
  },
  email: {
    sendSummary: `${API_PREFIX}/email/send-summary`,
    history: `${API_PREFIX}/email/history`,
  },
};

export default endpoints;
export const API_ENDPOINTS = {
  news: {
    list: '/api/v1/news',
    detail: (id: string | number) => `/api/v1/news/${id}`,
    search: '/api/v1/news/search',
    trending: '/api/v1/news/trending',
    fetchFresh: '/api/v1/news/fetch-fresh',
  },
  preferences: {
    base: '/api/v1/preferences',
    update: '/api/v1/preferences',
    topics: '/api/v1/preferences/topics',
  },
  auth: {
    login: '/api/v1/auth/login',
    register: '/api/v1/auth/register',
    refresh: '/api/v1/auth/refresh',
    logout: '/api/v1/auth/logout',
  },
  email: {
    sendSummary: '/api/v1/email/send-summary',
    history: '/api/v1/email/history',
  },
} as const;

export type ApiEndpointConfig = typeof API_ENDPOINTS;
