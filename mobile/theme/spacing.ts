// Spacing scale using an 8pt grid for consistent layout rhythm.
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  // Utility to compute arbitrary multiples of the base unit.
  scale: (multiplier: number = 1) => 8 * multiplier,
};

export type Spacing = typeof spacing;
