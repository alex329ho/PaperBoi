export type BackendPagination = {
  total?: number;
  limit?: number;
  offset?: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const extractApiData = <T>(payload: unknown): T => {
  if (isRecord(payload) && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
};

export const extractPagination = (payload: unknown): BackendPagination | undefined => {
  if (!isRecord(payload) || !isRecord(payload.pagination)) return undefined;
  const pagination = payload.pagination;
  return {
    total: typeof pagination.total === 'number' ? pagination.total : undefined,
    limit: typeof pagination.limit === 'number' ? pagination.limit : undefined,
    offset: typeof pagination.offset === 'number' ? pagination.offset : undefined,
  };
};
