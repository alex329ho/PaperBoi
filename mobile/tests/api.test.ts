import { AxiosError } from 'axios';
import { calculateBackoffDelay, buildDeduplicationKey } from '../utils/retry';
import { parseApiError } from '../services/errorHandler';

describe('retry utilities', () => {
  it('calculates increasing backoff with a max cap', () => {
    expect(calculateBackoffDelay(1)).toBe(500);
    expect(calculateBackoffDelay(2)).toBe(1000);
    expect(calculateBackoffDelay(5)).toBe(8000);
    expect(calculateBackoffDelay(10)).toBe(8000);
  });

  it('builds deterministic deduplication keys', () => {
    const key = buildDeduplicationKey({
      method: 'POST',
      url: '/api/v1/news',
      data: { q: 'tech' },
    });
    expect(key).toBe('post:/api/v1/news::{"q":"tech"}');
  });
});

describe('parseApiError', () => {
  it('flags offline errors', () => {
    const error = {
      isAxiosError: true,
      message: 'Network Error',
      code: 'ERR_NETWORK',
      config: { url: '/api/v1/news', method: 'get' },
      toJSON: () => ({}),
    } as AxiosError;

    const parsed = parseApiError(error);
    expect(parsed.isOffline).toBe(true);
    expect(parsed.message).toContain('offline');
  });

  it('returns message from server when available', () => {
    const error = {
      isAxiosError: true,
      message: 'Request failed',
      response: { status: 400, data: { message: 'Invalid request' } },
      config: { url: '/api/v1/news', method: 'get' },
      toJSON: () => ({}),
    } as unknown as AxiosError;

    const parsed = parseApiError(error);
    expect(parsed.message).toBe('Invalid request');
    expect(parsed.status).toBe(400);
  });
});
