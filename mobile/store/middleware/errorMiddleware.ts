import { Middleware } from '@reduxjs/toolkit';
import { setErrorMessage } from '../slices/uiSlice';

const errorMiddleware: Middleware = ({ dispatch }) => (next) => (action) => {
  try {
    return next(action);
  } catch (error) {
    dispatch(setErrorMessage((error as Error).message));
    return error;
  }
};

export default errorMiddleware;
