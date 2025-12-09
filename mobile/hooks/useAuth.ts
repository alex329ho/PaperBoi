import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './useRedux';
import { login, logout, register } from '../services/auth';
import { signInFailure, signInStart, signInSuccess, signOut } from '../store/slices/authSlice';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { user, loading, error } = useAppSelector((state) => state.auth);

  const signIn = useCallback(
    async (email: string, password: string) => {
      dispatch(signInStart());
      try {
        const profile = await login(email, password);
        dispatch(signInSuccess(profile));
        return profile;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unable to sign in';
        dispatch(signInFailure(message));
        throw err;
      }
    },
    [dispatch]
  );

  const createAccount = useCallback(
    async (name: string, email: string, password: string) => {
      dispatch(signInStart());
      try {
        const profile = await register(name, email, password);
        dispatch(signInSuccess(profile));
        return profile;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unable to register';
        dispatch(signInFailure(message));
        throw err;
      }
    },
    [dispatch]
  );

  const signOutUser = useCallback(async () => {
    await logout();
    dispatch(signOut());
  }, [dispatch]);

  return { user, loading, error, signIn, createAccount, signOutUser };
};
