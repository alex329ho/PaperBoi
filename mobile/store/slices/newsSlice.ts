import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchArticleDetail,
  fetchBookmarked,
  fetchNews,
  generateSummary,
  searchNews,
  persistBookmarkedArticles,
} from '../thunks/newsThunks';
import { Article, FilterState, NewsState, PaginationState } from '../types';

const initialFilter: FilterState = {
  topics: [],
  regions: [],
  languages: [],
  sortBy: 'recent',
};

const initialPagination: PaginationState = {
  page: 1,
  total: 0,
  limit: 20,
};

const initialState: NewsState = {
  articles: [],
  summaries: {},
  bookmarkedIds: [],
  filter: initialFilter,
  pagination: initialPagination,
  isLoading: false,
  error: null,
  lastFetch: null,
};

const newsSlice = createSlice({
  name: 'news',
  initialState,
  reducers: {
    setArticles(state, action: PayloadAction<Article[]>) {
      state.articles = action.payload;
      state.lastFetch = Date.now();
    },
    addArticles(state, action: PayloadAction<Article[]>) {
      const incoming = action.payload;
      const existingIds = new Set(state.articles.map((article) => article.id));
      const merged = [...state.articles];
      incoming.forEach((article) => {
        if (!existingIds.has(article.id)) {
          merged.push(article);
        }
      });
      state.articles = merged;
      state.lastFetch = Date.now();
    },
    setSummary(state, action: PayloadAction<{ id: string; summary: string }>) {
      state.summaries[action.payload.id] = action.payload.summary;
    },
    toggleBookmark(state, action: PayloadAction<string>) {
      const id = action.payload;
      if (state.bookmarkedIds.includes(id)) {
        state.bookmarkedIds = state.bookmarkedIds.filter((bookmarkId) => bookmarkId !== id);
      } else {
        state.bookmarkedIds.push(id);
      }
    },
    setFilter(state, action: PayloadAction<FilterState>) {
      state.filter = action.payload;
    },
    setPage(state, action: PayloadAction<number>) {
      state.pagination.page = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNews.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNews.fulfilled, (state, action) => {
        state.isLoading = false;
        state.articles = action.payload.articles;
        state.pagination = action.payload.pagination;
        state.lastFetch = Date.now();
      })
      .addCase(fetchNews.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Unable to fetch news';
      })
      .addCase(fetchArticleDetail.fulfilled, (state, action) => {
        const index = state.articles.findIndex((article) => article.id === action.payload.id);
        if (index >= 0) {
          state.articles[index] = action.payload;
        } else {
          state.articles.push(action.payload);
        }
      })
      .addCase(fetchArticleDetail.rejected, (state, action) => {
        state.error = action.error.message || 'Unable to fetch article';
      })
      .addCase(generateSummary.fulfilled, (state, action) => {
        state.summaries[action.payload.id] = action.payload.summary;
      })
      .addCase(generateSummary.rejected, (state, action) => {
        state.error = action.error.message || 'Unable to generate summary';
      })
      .addCase(searchNews.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchNews.fulfilled, (state, action) => {
        state.isLoading = false;
        state.articles = action.payload.articles;
        state.pagination = action.payload.pagination;
      })
      .addCase(searchNews.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Unable to search news';
      })
      .addCase(fetchBookmarked.fulfilled, (state, action) => {
        state.bookmarkedIds = action.payload.bookmarkedIds;
        state.articles = action.payload.articles;
      })
      .addCase(fetchBookmarked.rejected, (state, action) => {
        state.error = action.error.message || 'Unable to load bookmarks';
      })
      .addCase(persistBookmarkedArticles.fulfilled, (state, action) => {
        state.bookmarkedIds = action.payload.bookmarkedIds;
      })
      .addCase(persistBookmarkedArticles.rejected, (state, action) => {
        state.error = action.error.message || 'Unable to persist bookmarks';
      });
  },
});

export const {
  setArticles,
  addArticles,
  setSummary,
  toggleBookmark,
  setFilter,
  setPage,
  setLoading,
  setError,
} = newsSlice.actions;
export default newsSlice.reducer;
