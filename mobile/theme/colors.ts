// Color tokens for PaperBoi mobile theme.
// These palettes align with Material Design 3 color slots while keeping a consistent brand feel.
export const lightPalette = {
  primary: '#1F2121',
  primaryContainer: '#E0DEDD',
  onPrimary: '#FAFAF9',
  secondary: '#6B7577',
  secondaryContainer: '#F0EEED',
  onSecondary: '#1F2121',
  tertiary: '#0080FF',
  tertiaryContainer: '#D9ECFF',
  onTertiary: '#0B1E3A',
  background: '#FAFAF9',
  surface: '#FFFFFF',
  surfaceVariant: '#F2F1F0',
  onSurface: '#1F2121',
  onSurfaceVariant: '#6B7577',
  outline: '#E0DEDD',
  error: '#B91C1C',
  onError: '#FFFFFF',
  elevation: {
    level0: 'transparent',
    level1: '#FFFFFF',
    level2: '#F7F6F5',
    level3: '#F0EEED',
    level4: '#E8E6E5',
    level5: '#E0DEDD',
  },
  success: '#0F766E',
  warning: '#B45309',
  info: '#0EA5E9',
};

export const darkPalette = {
  primary: '#FAFAF9',
  primaryContainer: '#3D3F3F',
  onPrimary: '#1F2121',
  secondary: '#A9AAAA',
  secondaryContainer: '#3D3F3F',
  onSecondary: '#FAFAF9',
  tertiary: '#66AFFF',
  tertiaryContainer: '#103054',
  onTertiary: '#FAFAF9',
  background: '#1F2121',
  surface: '#2A2C2C',
  surfaceVariant: '#333535',
  onSurface: '#FAFAF9',
  onSurfaceVariant: '#A9AAAA',
  outline: '#3D3F3F',
  error: '#FCA5A5',
  onError: '#1F2121',
  elevation: {
    level0: 'transparent',
    level1: '#2A2C2C',
    level2: '#262828',
    level3: '#222424',
    level4: '#1F2121',
    level5: '#1A1C1C',
  },
  success: '#2DD4BF',
  warning: '#FBBF24',
  info: '#7DD3FC',
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
