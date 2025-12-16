import { StyleSheet } from 'react-native';
import { spacing } from './spacing';
import { lightPalette } from './colors';

// Global StyleSheet helpers for common layout patterns used throughout the app.
export const globalStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: lightPalette.background,
  },
  contentPadding: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  card: {
    backgroundColor: lightPalette.surface,
    borderRadius: 12,
    padding: spacing.md,
    shadowColor: 'rgba(0,0,0,0.08)',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 6,
    elevation: 2,
  },
  divider: {
    height: 1,
    backgroundColor: lightPalette.surfaceVariant,
    marginVertical: spacing.sm,
  },
});
