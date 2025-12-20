export function computeBackoffDelay(attempt: number, base = 300): number {
  // exponential backoff with jitter
  const exp = Math.pow(2, attempt - 1);
  const jitter = Math.random() * base;
  return Math.min(30000, Math.round(exp * base + jitter));
}

export async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 5): Promise<T> {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt > retries) throw err;
      const delay = computeBackoffDelay(attempt);
      // eslint-disable-next-line no-await-in-loop
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  throw new Error('Retry attempts exhausted');
}
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
