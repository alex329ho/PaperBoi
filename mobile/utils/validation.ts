export const isEmail = (value: string) => /\S+@\S+\.\S+/.test(value);
export const isNotEmpty = (value?: string | null) => Boolean(value && value.trim().length > 0);
