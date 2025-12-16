import { AxiosRequestConfig } from 'axios';

export interface Pagination {
  page: number;
  perPage: number;
  total: number;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string | number;
  isOffline?: boolean;
  url?: string;
  method?: string;
  correlationId?: string;
}

export interface ApiResponse<T> {
  data: T;
  pagination?: Pagination;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  author: string;
  publishedAt: string;
  tags?: string[];
}

export interface Preference {
  topics: string[];
  language?: string;
  timezone?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface EnhancedAxiosRequestConfig extends AxiosRequestConfig {
  queueIfOffline?: boolean;
  timeoutMs?: number;
  allowDeduplication?: boolean;
  skipRetry?: boolean;
  _retryCount?: number;
  _retryAuth?: boolean;
  meta?: {
    correlationId?: string;
    timestamp?: number;
    dedupeKey?: string;
  };
}
