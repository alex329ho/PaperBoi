export const truncate = (text: string | undefined, length = 140) => {
  if (!text) return '';
  if (text.length <= length) return text;
  return `${text.slice(0, length)}...`;
};
