import type { MD3Typescale } from 'react-native-paper/lib/typescript/types';

// Typography tokens used to construct the MD3 font configuration.
export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    mono: 'Menlo',
  },
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  lineHeights: {
    tight: 18,
    standard: 22,
    relaxed: 28,
    wide: 36,
  },
  letterSpacing: {
    tight: -0.2,
    normal: 0,
    wide: 0.4,
  },
};

// Map the typography tokens into the MD3 typescale expected by React Native Paper.
export const fontConfig: MD3Typescale = {
  default: {
    fontFamily: typography.fontFamily.regular,
    fontWeight: '400',
    letterSpacing: typography.letterSpacing.normal,
  },
  displayLarge: {
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
    fontSize: typography.sizes.xxl,
    letterSpacing: typography.letterSpacing.tight,
    lineHeight: 40,
  },
  displayMedium: {
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
    fontSize: typography.sizes.xl,
    letterSpacing: typography.letterSpacing.tight,
    lineHeight: 34,
  },
  displaySmall: {
    fontFamily: typography.fontFamily.medium,
    fontWeight: '600',
    fontSize: typography.sizes.lg,
    letterSpacing: typography.letterSpacing.normal,
    lineHeight: 30,
  },
  headlineLarge: {
    fontFamily: typography.fontFamily.medium,
    fontWeight: '600',
    fontSize: typography.sizes.lg,
    letterSpacing: typography.letterSpacing.normal,
    lineHeight: 28,
  },
  headlineMedium: {
    fontFamily: typography.fontFamily.medium,
    fontWeight: '600',
    fontSize: typography.sizes.md,
    letterSpacing: typography.letterSpacing.normal,
    lineHeight: 24,
  },
  headlineSmall: {
    fontFamily: typography.fontFamily.medium,
    fontWeight: '500',
    fontSize: typography.sizes.md,
    letterSpacing: typography.letterSpacing.normal,
    lineHeight: 22,
  },
  titleLarge: {
    fontFamily: typography.fontFamily.medium,
    fontWeight: '600',
    fontSize: typography.sizes.lg,
    letterSpacing: typography.letterSpacing.normal,
    lineHeight: 26,
  },
  titleMedium: {
    fontFamily: typography.fontFamily.medium,
    fontWeight: '500',
    fontSize: typography.sizes.md,
    letterSpacing: typography.letterSpacing.normal,
    lineHeight: 22,
  },
  titleSmall: {
    fontFamily: typography.fontFamily.medium,
    fontWeight: '500',
    fontSize: typography.sizes.sm,
    letterSpacing: typography.letterSpacing.normal,
    lineHeight: 20,
  },
  labelLarge: {
    fontFamily: typography.fontFamily.medium,
    fontWeight: '600',
    fontSize: typography.sizes.sm,
    letterSpacing: typography.letterSpacing.wide,
    lineHeight: 18,
  },
  labelMedium: {
    fontFamily: typography.fontFamily.medium,
    fontWeight: '600',
    fontSize: typography.sizes.xs,
    letterSpacing: typography.letterSpacing.wide,
    lineHeight: 16,
  },
  labelSmall: {
    fontFamily: typography.fontFamily.regular,
    fontWeight: '500',
    fontSize: typography.sizes.xs,
    letterSpacing: typography.letterSpacing.wide,
    lineHeight: 14,
  },
  bodyLarge: {
    fontFamily: typography.fontFamily.regular,
    fontWeight: '400',
    fontSize: typography.sizes.md,
    letterSpacing: typography.letterSpacing.normal,
    lineHeight: typography.lineHeights.standard,
  },
  bodyMedium: {
    fontFamily: typography.fontFamily.regular,
    fontWeight: '400',
    fontSize: typography.sizes.sm,
    letterSpacing: typography.letterSpacing.normal,
    lineHeight: 20,
  },
  bodySmall: {
    fontFamily: typography.fontFamily.regular,
    fontWeight: '400',
    fontSize: typography.sizes.xs,
    letterSpacing: typography.letterSpacing.normal,
    lineHeight: 16,
  },
};
