import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  imageUrl?: string;
  publishedAt: string;
  source?: string;
}

interface NewsState {
  articles: Article[];
  saved: Article[];
  isLoading: boolean;
}

const initialState: NewsState = {
  articles: [],
  saved: [],
  isLoading: false
};

const newsSlice = createSlice({
  name: 'news',
  initialState,
  reducers: {
    setArticles(state, action: PayloadAction<Article[]>) {
      state.articles = action.payload;
    },
    addSaved(state, action: PayloadAction<Article>) {
      state.saved.push(action.payload);
    },
    removeSaved(state, action: PayloadAction<string>) {
      state.saved = state.saved.filter((article) => article.id !== action.payload);
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    }
  }
});

export const { setArticles, addSaved, removeSaved, setLoading } = newsSlice.actions;
export default newsSlice.reducer;
