import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchArticleDetail,
  fetchBookmarked,
  fetchNews,
  generateSummary,
  searchNews,
  persistBookmarkedArticles,
} from '../thunks/newsThunks';
import {
  Article,
  ArticleReport,
  FetchFeedParams,
  FilterState,
  NewsState,
  PaginationState,
  SearchParams,
} from '../types';

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
  reports: {},
  bookmarkedIds: [],
  saved: [],
  recentSearches: [],
  filter: initialFilter,
  pagination: initialPagination,
  isLoading: false,
  loading: false,
  error: null,
  lastFetch: null,
  feed: {
    items: [],
    loading: false,
    refreshing: false,
    hasNextPage: false,
    page: initialPagination.page,
    error: null,
  },
  search: {
    results: [],
    loading: false,
    hasNextPage: false,
    page: 1,
    query: undefined,
    error: null,
  },
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
    setReport(state, action: PayloadAction<{ id: string; report: ArticleReport }>) {
      state.reports[action.payload.id] = action.payload.report;
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
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    clearFeed(state) {
      state.articles = [];
      state.pagination = { ...initialPagination };
      state.lastFetch = null;
    },
    saveArticle(state, action: PayloadAction<Article>) {
      const exists = state.saved.some((article) => article.id === action.payload.id);
      if (!exists) {
        state.saved.push(action.payload);
      }
      if (!state.bookmarkedIds.includes(action.payload.id)) {
        state.bookmarkedIds.push(action.payload.id);
      }
    },
    removeSavedArticle(state, action: PayloadAction<string>) {
      state.saved = state.saved.filter((article) => article.id !== action.payload);
      state.bookmarkedIds = state.bookmarkedIds.filter((id) => id !== action.payload);
    },
    setRecentSearches(state, action: PayloadAction<string[]>) {
      state.recentSearches = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNews.pending, (state) => {
        state.isLoading = true;
        state.loading = true;
        if (!state.feed) state.feed = { items: [], loading: true, refreshing: false, hasNextPage: false, page: 1, error: null };
        else state.feed.loading = true;
        state.error = null;
      })
      .addCase(fetchNews.fulfilled, (state, action) => {
        state.isLoading = false;
        state.loading = false;
        state.articles = action.payload.articles;
        state.pagination = action.payload.pagination;
        state.lastFetch = Date.now();
        const page = action.payload.pagination.page;
        const limit = action.payload.pagination.limit;
        const total = action.payload.pagination.total;
        state.feed = {
          items: action.payload.articles,
          loading: false,
          refreshing: false,
          page,
          hasNextPage: page * limit < total,
          error: null,
        };
      })
      .addCase(fetchNews.rejected, (state, action) => {
        state.isLoading = false;
        state.loading = false;
        const payloadMsg = (action.payload as unknown) as string | undefined;
        const msg = payloadMsg ?? action.error.message ?? 'Unable to fetch news';
        state.error = msg;
        if (!state.feed)
          state.feed = { items: [], loading: false, refreshing: false, hasNextPage: false, page: 1, error: state.error };
        else {
          state.feed.loading = false;
          state.feed.error = state.error;
        }
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
        if (action.payload.report) {
          state.reports[action.payload.id] = action.payload.report;
        }
      })
      .addCase(generateSummary.rejected, (state, action) => {
        state.error = action.error.message || 'Unable to generate summary';
      })
      .addCase(searchNews.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        if (!state.search) state.search = { results: [], loading: true, hasNextPage: false, page: 1, query: undefined, error: null };
        else state.search.loading = true;
      })
      .addCase(searchNews.fulfilled, (state, action) => {
        state.isLoading = false;
        state.articles = action.payload.articles;
        state.pagination = action.payload.pagination;
        const page = action.payload.pagination.page;
        const limit = action.payload.pagination.limit;
        const total = action.payload.pagination.total;
        const query = action.meta.arg.query;
        state.search = {
          results: action.payload.articles,
          loading: false,
          page,
          hasNextPage: page * limit < total,
          query,
          error: null,
        };
      })
      .addCase(searchNews.rejected, (state, action) => {
        state.isLoading = false;
        const payloadMsg = (action.payload as unknown) as string | undefined;
        const msg = payloadMsg ?? action.error.message ?? 'Unable to search news';
        state.error = msg;
        if (!state.search)
          state.search = { results: [], loading: false, hasNextPage: false, page: 1, query: undefined, error: state.error };
        else {
          state.search.loading = false;
          state.search.error = state.error;
        }
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
  setReport,
  toggleBookmark,
  setFilter,
  setPage,
  setLoading,
  setError,
  clearFeed,
  saveArticle,
  removeSavedArticle,
  setRecentSearches,
} = newsSlice.actions;

export { fetchNews as fetchFeed, searchNews };
export type { Article, FetchFeedParams, SearchParams, NewsState };
export default newsSlice.reducer;
