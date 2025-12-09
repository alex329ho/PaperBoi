import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  globalLoading: boolean;
  errorMessage: string | null;
}

const initialState: UIState = {
  globalLoading: false,
  errorMessage: null
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setGlobalLoading(state, action: PayloadAction<boolean>) {
      state.globalLoading = action.payload;
    },
    setErrorMessage(state, action: PayloadAction<string | null>) {
      state.errorMessage = action.payload;
    }
  }
});

export const { setGlobalLoading, setErrorMessage } = uiSlice.actions;
export default uiSlice.reducer;
