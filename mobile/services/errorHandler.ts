import { AxiosError } from 'axios';
import { ApiError, EnhancedAxiosRequestConfig } from '../types/api';

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isAxiosError = (error: unknown): error is AxiosError =>
  isRecord(error) && error.isAxiosError === true;

export const parseApiError = (error: unknown): ApiError => {
  if (isAxiosError(error)) {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;
    const responseData = axiosError.response?.data;
    const messageFromServer =
      isRecord(responseData) && typeof responseData.message === 'string'
        ? responseData.message
        : undefined;
    const isOffline =
      networkErrorCodes.has(axiosError.code || '') || axiosError.message === 'Network Error';
    const config = axiosError.config as EnhancedAxiosRequestConfig | undefined;

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
      correlationId: config?.meta?.correlationId,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'UNKNOWN',
      isOffline: false,
    };
  }

  return {
    message: 'Unexpected error occurred.',
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
