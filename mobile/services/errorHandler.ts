import { AxiosError } from 'axios';

export type FriendlyError = {
  message: string;
  code?: string | number;
  status?: number;
  isNetwork?: boolean;
  isTimeout?: boolean;
};

export function parseAxiosError(err: any): FriendlyError {
  if (!err) return { message: 'Unknown error' };

  // Cancelled
  if (err.__CANCEL__) return { message: 'Request cancelled' };

  // Axios network error
  if (err.isAxiosError) {
    const aerr = err as AxiosError;
    const status = aerr.response?.status;
    const data = aerr.response?.data;

    const isTimeout = aerr.code === 'ECONNABORTED';

    if (!aerr.response) {
      // No response -> network error
      return { message: 'Network error. Please check your connection.', isNetwork: true };
    }

    // Map common statuses
    if (status === 401) return { message: 'Session expired. Please sign in again.', status };
    if (status === 403) return { message: 'You do not have permission to perform this action.', status };
    if (status === 404) return { message: 'Resource not found.', status };
    if (status === 429) return { message: 'Too many requests. Try again later.', status };
    if (status && status >= 500) return { message: 'Server error. Try again later.', status };

    // If API returns structured error
    const msg = data?.message || data?.error || aerr.message || 'Request failed';
    return { message: String(msg), status, isTimeout };
  }

  // Unknown
  return { message: err.message || String(err) };
}

export function handleAndLogError(err: any) {
  const parsed = parseAxiosError(err);
  // eslint-disable-next-line no-console
  console.error('[API Error]', parsed, err.stack || '');
  return parsed;
}
import { AxiosError } from 'axios';
import { ApiError } from '../types/api';

const networkErrorCodes = new Set(['ECONNABORTED', 'ENOTFOUND', 'ERR_NETWORK']);

const statusMessages: Record<number, string> = {
  400: 'Invalid request. Please check your input.',
  401: 'You need to login again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested content was not found.',
  429: 'Too many requests. Please wait and try again.',
  500: 'Something went wrong on our end.',
  503: 'Service temporarily unavailable. Please try later.',
};

export const parseApiError = (error: AxiosError | Error): ApiError => {
  if ((error as AxiosError).isAxiosError) {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;
    const messageFromServer = (axiosError.response?.data as any)?.message as string | undefined;
    const isOffline =
      networkErrorCodes.has(axiosError.code || '') || axiosError.message === 'Network Error';

    return {
      message:
        messageFromServer ||
        statusMessages[status || 0] ||
        (isOffline ? 'You appear to be offline.' : 'Unexpected error occurred.'),
      status,
      code: axiosError.code,
      isOffline,
      url: axiosError.config?.url,
      method: axiosError.config?.method,
      correlationId: (axiosError.config as any)?.meta?.correlationId,
    };
  }

  return {
    message: error.message,
    code: 'UNKNOWN',
    isOffline: false,
  };
};

export const logApiError = (error: ApiError) => {
  if (__DEV__) {
    console.error('[API ERROR]', error);
  }
};

export const isNetworkError = (error: ApiError) => error.isOffline;

export default parseApiError;
