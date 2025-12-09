import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../services/endpoints';

export type Article = {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  imageUrl?: string;
  content?: string;
  url?: string;
  language?: string;
  region?: string;
  readingTime?: number;
};

export type ArticleFilters = {
  topics: string[];
  regions: string[];
  languages: string[];
  sortBy: 'latest' | 'relevance';
};

type PaginatedState = {
  items: Article[];
  page: number;
  hasNextPage: boolean;
  loading: boolean;
  refreshing: boolean;
  error?: string;
  filters: ArticleFilters;
};

type SearchState = {
  query: string;
  results: Article[];
  page: number;
  hasNextPage: boolean;
  loading: boolean;
  error?: string;
  recent: string[];
  filters: ArticleFilters;
};

export type NewsState = {
  feed: PaginatedState;
  search: SearchState;
  saved: Article[];
};

const baseFilters: ArticleFilters = {
  topics: [],
  regions: [],
  languages: [],
  sortBy: 'latest',
};

const initialState: NewsState = {
  feed: {
    items: [],
    page: 1,
    hasNextPage: true,
    loading: false,
    refreshing: false,
    error: undefined,
    filters: { ...baseFilters },
  },
  search: {
    query: '',
    results: [],
    page: 1,
    hasNextPage: true,
    loading: false,
    error: undefined,
    recent: [],
    filters: { ...baseFilters },
  },
  saved: [],
};

export type FetchFeedParams = {
  page?: number;
  filters?: Partial<ArticleFilters>;
  reset?: boolean;
};

export type SearchParams = {
  query: string;
  page?: number;
  filters?: Partial<ArticleFilters>;
  reset?: boolean;
};

export const fetchFeed = createAsyncThunk(
  'news/fetchFeed',
  async ({ page = 1, filters }: FetchFeedParams = {}) => {
    const { data } = await api.get(API_ENDPOINTS.topStories, {
      params: { page, ...filters },
    });
    const hasNextPage = data?.hasNextPage ?? data?.hasNext ?? Boolean(data?.articles?.length);
    return { articles: data.articles as Article[], page, hasNextPage, filters };
  }
);

export const searchNews = createAsyncThunk(
  'news/search',
  async ({ query, page = 1, filters }: SearchParams) => {
    const { data } = await api.get(API_ENDPOINTS.search, {
      params: { q: query, page, ...filters },
    });
    const hasNextPage = data?.hasNextPage ?? data?.hasNext ?? Boolean(data?.articles?.length);
    return { results: data.articles as Article[], query, page, hasNextPage, filters };
  }
);

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
    setFeedFilters(state, action: PayloadAction<Partial<ArticleFilters>>) {
      state.feed.filters = { ...state.feed.filters, ...action.payload };
    },
    setSearchFilters(state, action: PayloadAction<Partial<ArticleFilters>>) {
      state.search.filters = { ...state.search.filters, ...action.payload };
    },
    setRecentSearches(state, action: PayloadAction<string[]>) {
      state.search.recent = action.payload;
    },
    clearFeed(state) {
      state.feed.items = [];
      state.feed.page = 1;
      state.feed.hasNextPage = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFeed.pending, (state, action) => {
        const isRefresh = action.meta.arg?.page === 1;
        state.feed.loading = !isRefresh;
        state.feed.refreshing = isRefresh;
        state.feed.error = undefined;
      })
      .addCase(fetchFeed.fulfilled, (state, action) => {
        const { articles, page, hasNextPage, filters } = action.payload;
        state.feed.loading = false;
        state.feed.refreshing = false;
        state.feed.page = page;
        state.feed.hasNextPage = hasNextPage;
        state.feed.filters = { ...state.feed.filters, ...filters };
        state.feed.items = page === 1 ? articles : [...state.feed.items, ...articles];
      })
      .addCase(fetchFeed.rejected, (state, action) => {
        state.feed.loading = false;
        state.feed.refreshing = false;
        state.feed.error = action.error.message;
      })
      .addCase(searchNews.pending, (state, action) => {
        const isRefresh = action.meta.arg?.page === 1;
        state.search.loading = !isRefresh;
        state.search.page = action.meta.arg?.page ?? 1;
        state.search.error = undefined;
        if (isRefresh) {
          state.search.results = [];
        }
      })
      .addCase(searchNews.fulfilled, (state, action) => {
        const { results, query, page, hasNextPage, filters } = action.payload;
        state.search.loading = false;
        state.search.query = query;
        state.search.page = page;
        state.search.hasNextPage = hasNextPage;
        state.search.filters = { ...state.search.filters, ...filters };
        state.search.results = page === 1 ? results : [...state.search.results, ...results];
        if (query && !state.search.recent.includes(query)) {
          state.search.recent = [query, ...state.search.recent].slice(0, 10);
        }
      })
      .addCase(searchNews.rejected, (state, action) => {
        state.search.loading = false;
        state.search.error = action.error.message;
      });
  },
});

export const { saveArticle, removeSavedArticle, setFeedFilters, setSearchFilters, setRecentSearches, clearFeed } =
  newsSlice.actions;
export default newsSlice.reducer;
