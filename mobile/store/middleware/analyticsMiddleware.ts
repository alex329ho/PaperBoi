import { Middleware } from '@reduxjs/toolkit';

const analyticsMiddleware: Middleware = () => (next) => (action) => {
  const start = Date.now();
  const result = next(action);
  const duration = Date.now() - start;
  // Lightweight analytics hook for future integrations
  console.debug(`[analytics] action=${action.type} duration=${duration}ms`);
  return result;
};

export default analyticsMiddleware;
