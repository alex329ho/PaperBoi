import { AnyAction, Middleware } from '@reduxjs/toolkit';
import { setError } from '../slices/uiSlice';

const errorMiddleware: Middleware = (storeAPI) => (next) => (action: AnyAction) => {
  const result = next(action);

  if ((action as any).type.endsWith('rejected')) {
    const message = (action as any).error?.message || 'Something went wrong';
    storeAPI.dispatch(setError(message));
  }

  return result;
};

export default errorMiddleware;
