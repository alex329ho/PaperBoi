import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchTopStories } from '../../services/api';

export type Article = {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  imageUrl?: string;
  content?: string;
};

export type NewsState = {
  articles: Article[];
  saved: Article[];
  loading: boolean;
  error?: string;
};

const initialState: NewsState = {
  articles: [],
  saved: [],
  loading: false,
  error: undefined,
};

export const loadTopStories = createAsyncThunk('news/loadTopStories', async () => fetchTopStories());

const newsSlice = createSlice({
  name: 'news',
  initialState,
  reducers: {
    saveArticle(state, action: PayloadAction<Article>) {
      const exists = state.saved.some((article) => article.id === action.payload.id);
      if (!exists) {
        state.saved.push(action.payload);
      }
    },
    removeSavedArticle(state, action: PayloadAction<string>) {
      state.saved = state.saved.filter((article) => article.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadTopStories.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(loadTopStories.fulfilled, (state, action: PayloadAction<Article[]>) => {
        state.loading = false;
        state.articles = action.payload;
      })
      .addCase(loadTopStories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export const { saveArticle, removeSavedArticle } = newsSlice.actions;
export default newsSlice.reducer;
