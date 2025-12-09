export const formatDate = (date: string | number | Date) => {
  const parsed = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return parsed.toLocaleDateString();
};
