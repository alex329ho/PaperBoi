import { useCallback } from 'react';
import { loginSuccess, logout, UserProfile } from '@store/slices/authSlice';
import { useAppDispatch, useAppSelector } from './useRedux';
import authService from '@services/auth';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  const login = useCallback(
    async (email: string, password: string) => {
      const profile: UserProfile = await authService.login(email, password);
      dispatch(loginSuccess(profile));
      return profile;
    },
    [dispatch]
  );

  const signOut = useCallback(async () => {
    await authService.logout();
    dispatch(logout());
  }, [dispatch]);

  return { user, isAuthenticated, login, signOut };
};
