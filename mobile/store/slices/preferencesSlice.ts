import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type PreferencesState = {
  topics: string[];
  regions: string[];
  digestTime?: string;
};

const initialState: PreferencesState = {
  topics: [],
  regions: [],
  digestTime: undefined,
};

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    setTopics(state, action: PayloadAction<string[]>) {
      state.topics = action.payload;
    },
    setRegions(state, action: PayloadAction<string[]>) {
      state.regions = action.payload;
    },
    setDigestTime(state, action: PayloadAction<string | undefined>) {
      state.digestTime = action.payload;
    },
  },
});

export const { setTopics, setRegions, setDigestTime } = preferencesSlice.actions;
export default preferencesSlice.reducer;
