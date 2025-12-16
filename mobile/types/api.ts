export type ApiResponse<T = any> = {
  ok: boolean;
  data?: T;
  error?: string | null;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  perPage: number;
};

export type ApiError = {
  message: string;
  code?: string | number;
};
import { AxiosRequestConfig } from 'axios';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  isOffline?: boolean;
  url?: string;
  method?: string;
  correlationId?: string;
}

export interface Pagination {
  page: number;
  perPage: number;
  total: number;
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

export interface ApiResponse<T> {
  data: T;
  pagination?: Pagination;
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
