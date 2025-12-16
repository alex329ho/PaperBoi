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
