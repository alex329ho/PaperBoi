export const truncate = (text: string, length = 140) => {
  if (text.length <= length) return text;
  return `${text.slice(0, length)}...`;
};
