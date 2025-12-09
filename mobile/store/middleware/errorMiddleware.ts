import { Middleware } from '@reduxjs/toolkit';
import { setError } from '../slices/uiSlice';

const errorMiddleware: Middleware = (storeAPI) => (next) => (action) => {
  const result = next(action);

  if (action.type.endsWith('rejected')) {
    const message = action.error?.message || 'Something went wrong';
    storeAPI.dispatch(setError(message));
  }

  return result;
};

export default errorMiddleware;
