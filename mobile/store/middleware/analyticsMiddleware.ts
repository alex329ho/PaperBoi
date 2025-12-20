import { AnyAction, Middleware } from '@reduxjs/toolkit';

const analyticsMiddleware: Middleware = () => (next) => (action) => {
  const start = Date.now();
  const typedAction = action as AnyAction;
  const result = next(typedAction);
  const duration = Date.now() - start;
  // Lightweight analytics hook for future integrations
  console.debug(`[analytics] action=${typedAction.type ?? 'unknown'} duration=${duration}ms`);
  return result;
};

export default analyticsMiddleware;
