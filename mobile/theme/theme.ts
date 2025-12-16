import { MD3DarkTheme, MD3LightTheme, MD3Theme, configureFonts } from 'react-native-paper';
import { darkPalette, lightPalette } from './colors';
import { fontConfig, typography } from './typography';
import { spacing } from './spacing';

export type AppTheme = MD3Theme & {
  spacing: typeof spacing;
  custom: {
    typography: typeof typography;
    palette: typeof lightPalette;
  };
};

const baseRoundness = 12;

export const lightTheme: AppTheme = {
  ...MD3LightTheme,
  roundness: baseRoundness,
  colors: {
    ...MD3LightTheme.colors,
    ...lightPalette,
  },
  fonts: configureFonts({ config: fontConfig }),
  spacing,
  custom: {
    typography,
    palette: lightPalette,
  },
};

export const darkTheme: AppTheme = {
  ...MD3DarkTheme,
  roundness: baseRoundness,
  colors: {
    ...MD3DarkTheme.colors,
    ...darkPalette,
  },
  fonts: configureFonts({ config: fontConfig }),
  spacing,
  custom: {
    typography,
    palette: darkPalette,
  },
};

export const appThemes = {
  light: lightTheme,
  dark: darkTheme,
};

export type ThemeMode = keyof typeof appThemes;

// Lower-case alias used by automated validation scripts while keeping the
// more descriptive `appThemes` export for application code.
export const theme = appThemes;
