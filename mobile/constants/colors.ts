import { darkPalette, lightPalette } from '../theme/colors';

// Convenient re-export of the color palettes for non-theming modules.
export const colors = {
  light: lightPalette,
  dark: darkPalette,
};

export type ColorMode = keyof typeof colors;
