import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  token?: string;
};

export type AuthState = {
  user: UserProfile | null;
  loading: boolean;
  error?: string;
};

const initialState: AuthState = {
  user: null,
  loading: false,
  error: undefined,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    signInStart(state) {
      state.loading = true;
      state.error = undefined;
    },
    signInSuccess(state, action: PayloadAction<UserProfile>) {
      state.user = action.payload;
      state.loading = false;
    },
    signInFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.loading = false;
    },
    signOut(state) {
      state.user = null;
    },
  },
});

export const { signInStart, signInSuccess, signInFailure, signOut } = authSlice.actions;
export default authSlice.reducer;
