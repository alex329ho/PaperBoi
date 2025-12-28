type GeneratedPalette = {
  background: string;
  accent: string;
  text: string;
};

const PALETTES: GeneratedPalette[] = [
  { background: '#E2E8F0', accent: '#64748B', text: '#0F172A' },
  { background: '#FEF3C7', accent: '#F59E0B', text: '#7C2D12' },
  { background: '#DBEAFE', accent: '#2563EB', text: '#1E3A8A' },
  { background: '#DCFCE7', accent: '#16A34A', text: '#14532D' },
  { background: '#FFE4E6', accent: '#E11D48', text: '#881337' },
  { background: '#F3E8FF', accent: '#7C3AED', text: '#4C1D95' },
];

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const extractDomain = (rawUrl?: string) => {
  if (!rawUrl) return undefined;
  try {
    return new URL(rawUrl).hostname;
  } catch {
    const match = rawUrl.match(/^(?:https?:\/\/)?([^/?#]+)/i);
    return match?.[1];
  }
};

export const getGeneratedPalette = (seed?: string) => {
  const normalized = seed && seed.trim().length ? seed.trim() : 'paperboi';
  const hash = hashString(normalized);
  return PALETTES[hash % PALETTES.length];
};

export const getFaviconUrl = (rawUrl?: string) => {
  const domain = extractDomain(rawUrl);
  if (!domain) return undefined;
  if (domain.endsWith(".example")) return undefined;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
};

export const getInitials = (value?: string, fallback = 'PB') => {
  if (!value) return fallback;
  const cleaned = value.replace(/[^A-Za-z0-9 ]/g, '').trim();
  if (!cleaned) return fallback;
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (!tokens.length) return fallback;
  const initials = tokens
    .slice(0, 2)
    .map((token) => token.charAt(0).toUpperCase())
    .join('');
  return initials || fallback;
};

export type { GeneratedPalette };
