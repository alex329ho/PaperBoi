import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type UIState = {
  loadingMessage?: string;
  errorMessage?: string;
  theme: 'light' | 'dark';
};

const initialState: UIState = {
  loadingMessage: undefined,
  errorMessage: undefined,
  theme: 'light',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    showLoading(state, action: PayloadAction<string | undefined>) {
      state.loadingMessage = action.payload;
    },
    hideLoading(state) {
      state.loadingMessage = undefined;
    },
    setError(state, action: PayloadAction<string | undefined>) {
      state.errorMessage = action.payload;
    },
    setTheme(state, action: PayloadAction<'light' | 'dark'>) {
      state.theme = action.payload;
    },
  },
});

export const { showLoading, hideLoading, setError, setTheme } = uiSlice.actions;
export default uiSlice.reducer;
