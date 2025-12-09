import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface PreferencesState {
  topics: string[];
  regions: string[];
  dailyDigestTime: string | null;
}

const initialState: PreferencesState = {
  topics: [],
  regions: [],
  dailyDigestTime: null
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
    setDailyDigestTime(state, action: PayloadAction<string | null>) {
      state.dailyDigestTime = action.payload;
    }
  }
});

export const { setTopics, setRegions, setDailyDigestTime } = preferencesSlice.actions;
export default preferencesSlice.reducer;
