import { useColorScheme } from 'react-native';
import { useAppSelector } from './useRedux';

export const useTheme = () => {
  const systemScheme = useColorScheme();
  const themePreference = useAppSelector((state) => state.settings.theme);
  const isDark = themePreference === 'dark' || (themePreference === 'system' && systemScheme === 'dark');

  return { isDark, themePreference };
};
