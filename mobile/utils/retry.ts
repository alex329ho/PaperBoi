import { AxiosRequestConfig } from 'axios';
import { EnhancedAxiosRequestConfig } from '../types/api';

export const calculateBackoffDelay = (attempt: number, base = 500, max = 8000) => {
  const exponent = Math.min(attempt, 10);
  const delay = base * 2 ** (exponent - 1);
  return Math.min(delay, max);
};

export const applyJitter = (delayMs: number) => {
  const jitter = delayMs * 0.4;
  const randomOffset = Math.random() * jitter;
  return Math.floor(delayMs - jitter / 2 + randomOffset);
};

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const createCorrelationId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const buildDeduplicationKey = (config: AxiosRequestConfig | EnhancedAxiosRequestConfig) => {
  const method = (config.method || 'get').toLowerCase();
  const url = config.url || '';
  const params = config.params ? JSON.stringify(config.params) : '';
  const data = config.data ? JSON.stringify(config.data) : '';
  return `${method}:${url}:${params}:${data}`;
};

export default calculateBackoffDelay;
