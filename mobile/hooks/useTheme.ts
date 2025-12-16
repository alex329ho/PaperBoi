import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { appThemes } from '../theme/theme';
import { useAppDispatch, useAppSelector } from './useRedux';
import { setTheme } from '../store/slices/uiSlice';

export const useTheme = () => {
  const systemScheme = useColorScheme();
  const dispatch = useAppDispatch();
  const preference = useAppSelector((state) => state.ui.theme);

  const theme = useMemo(() => {
    const mode = preference || systemScheme || 'light';
    return mode === 'dark' ? appThemes.dark : appThemes.light;
  }, [preference, systemScheme]);

  const toggleTheme = () => {
    dispatch(setTheme(preference === 'dark' ? 'light' : 'dark'));
  };

  return { theme, toggleTheme, mode: theme.dark ? 'dark' : 'light' } as const;
};
