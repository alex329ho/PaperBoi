// Color tokens for PaperBoi mobile theme.
// These palettes align with Material Design 3 color slots while keeping a consistent brand feel.
export const lightPalette = {
  primary: '#4F46E5',
  primaryContainer: '#E0E7FF',
  onPrimary: '#FFFFFF',
  secondary: '#22C55E',
  secondaryContainer: '#DCFCE7',
  onSecondary: '#022C16',
  tertiary: '#F59E0B',
  tertiaryContainer: '#FEF3C7',
  onTertiary: '#3B2700',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceVariant: '#E2E8F0',
  onSurface: '#0F172A',
  onSurfaceVariant: '#475569',
  outline: '#CBD5E1',
  error: '#DC2626',
  onError: '#FFFFFF',
  elevation: {
    level0: 'transparent',
    level1: '#F8FAFC',
    level2: '#EEF2FF',
    level3: '#E2E8F0',
    level4: '#CBD5E1',
    level5: '#94A3B8',
  },
  success: '#16A34A',
  warning: '#EA580C',
  info: '#2563EB',
};

export const darkPalette = {
  primary: '#A5B4FC',
  primaryContainer: '#312E81',
  onPrimary: '#111827',
  secondary: '#4ADE80',
  secondaryContainer: '#14532D',
  onSecondary: '#ECFDF3',
  tertiary: '#FCD34D',
  tertiaryContainer: '#78350F',
  onTertiary: '#FFFBEB',
  background: '#0F172A',
  surface: '#111827',
  surfaceVariant: '#1F2937',
  onSurface: '#E2E8F0',
  onSurfaceVariant: '#CBD5E1',
  outline: '#475569',
  error: '#F87171',
  onError: '#111827',
  elevation: {
    level0: 'transparent',
    level1: '#111827',
    level2: '#0B1223',
    level3: '#0A101D',
    level4: '#090E18',
    level5: '#080C14',
  },
  success: '#22C55E',
  warning: '#FB923C',
  info: '#60A5FA',
};

export type Palette = typeof lightPalette;

export const palettes = {
  light: lightPalette,
  dark: darkPalette,
};

// Convenient named export used by tooling checks and consumers that prefer a
// single object reference for both palettes. Keeping this camel-cased export
// also ensures the verification script can detect the configuration without
// altering existing theme usage.
export const colors = palettes;
