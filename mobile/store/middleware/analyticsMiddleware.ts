import { Middleware } from '@reduxjs/toolkit';

const analyticsMiddleware: Middleware = () => (next) => (action) => {
  // Placeholder for analytics tracking integration
  return next(action);
};

export default analyticsMiddleware;
