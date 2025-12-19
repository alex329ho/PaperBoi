export const formatDate = (date: string | number | Date | undefined) => {
  if (!date) {
    return 'Date unknown';
  }
  const value = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return value.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};
