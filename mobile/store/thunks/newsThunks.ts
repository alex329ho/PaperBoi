import { createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addPendingAction } from '../slices/syncSlice';
import { Article, FilterState, PaginationState, RootState } from '../types';

const API_BASE_URL = 'https://api.paperboi.app';

const persistBookmarks = async (ids: string[]) => {
  await AsyncStorage.setItem('paperboi_bookmarks', JSON.stringify(ids));
};

const enqueueWhenOffline = async (
  thunkApi: Parameters<Parameters<typeof createAsyncThunk>[1]>[1],
  actionType: string,
  args: unknown,
  critical = false,
) => {
  thunkApi.dispatch(
    addPendingAction({
      id: `${actionType}-${Date.now()}`,
      actionType,
      args,
      attempt: 0,
      createdAt: Date.now(),
      critical,
    }),
  );
  return thunkApi.rejectWithValue('offline');
};

export const fetchNews = createAsyncThunk<
  { articles: Article[]; pagination: PaginationState },
  { filter?: FilterState; page?: number; limit?: number },
  { state: RootState }
>('news/fetchNews', async (params = {}, thunkApi) => {
  const { getState } = thunkApi;
  if (getState().ui.networkStatus === 'offline') {
    return enqueueWhenOffline(thunkApi, 'news/fetchNews', params);
  }

  const state = getState();
  const filter = params.filter ?? state.news.filter;
  const page = params.page ?? state.news.pagination.page;
  const limit = params.limit ?? state.news.pagination.limit;
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sortBy: filter.sortBy,
  });
  filter.topics.forEach((topic) => query.append('topics', topic));
  filter.regions.forEach((region) => query.append('regions', region));
  filter.languages.forEach((language) => query.append('languages', language));

  try {
    const response = await fetch(`${API_BASE_URL}/news?${query.toString()}`);
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Unable to fetch news');
    }
    const data = await response.json();
    return {
      articles: data.articles as Article[],
      pagination: {
        page: data.page ?? page,
        total: data.total ?? data.articles?.length ?? 0,
        limit,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error fetching news';
    return thunkApi.rejectWithValue(message);
  }
});

export const fetchArticleDetail = createAsyncThunk<Article, string, { state: RootState }>(
  'news/fetchArticleDetail',
  async (articleId, thunkApi) => {
    const { getState } = thunkApi;
    if (getState().ui.networkStatus === 'offline') {
      return enqueueWhenOffline(thunkApi, 'news/fetchArticleDetail', articleId);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/news/${articleId}`);
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Unable to fetch article');
      }
      const data: Article = await response.json();
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error fetching article';
      return thunkApi.rejectWithValue(message);
    }
  },
);

export const generateSummary = createAsyncThunk<
  { id: string; summary: string },
  { articleId: string; length: 'SHORT' | 'MEDIUM' | 'LONG' },
  { state: RootState }
>('news/generateSummary', async ({ articleId, length }, thunkApi) => {
  if (thunkApi.getState().ui.networkStatus === 'offline') {
    return enqueueWhenOffline(thunkApi, 'news/generateSummary', { articleId, length });
  }

  try {
    const response = await fetch(`${API_BASE_URL}/news/${articleId}/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ length }),
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Unable to generate summary');
    }
    const data = await response.json();
    return { id: articleId, summary: data.summary as string };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error generating summary';
    return thunkApi.rejectWithValue(message);
  }
});

export const searchNews = createAsyncThunk<
  { articles: Article[]; pagination: PaginationState },
  { query: string; filter?: FilterState },
  { state: RootState }
>('news/searchNews', async ({ query, filter }, thunkApi) => {
  const { getState } = thunkApi;
  if (getState().ui.networkStatus === 'offline') {
    return enqueueWhenOffline(thunkApi, 'news/searchNews', { query, filter });
  }

  try {
    const payload = {
      query,
      filter: filter ?? getState().news.filter,
    };
    const response = await fetch(`${API_BASE_URL}/news/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Unable to search news');
    }
    const data = await response.json();
    return {
      articles: data.articles as Article[],
      pagination: {
        page: data.page ?? 1,
        total: data.total ?? data.articles?.length ?? 0,
        limit: data.limit ?? getState().news.pagination.limit,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error searching news';
    return thunkApi.rejectWithValue(message);
  }
});

export const fetchBookmarked = createAsyncThunk<
  { bookmarkedIds: string[]; articles: Article[] },
  void,
  { state: RootState }
>('news/fetchBookmarked', async (_, thunkApi) => {
  try {
    const storedBookmarks = await AsyncStorage.getItem('paperboi_bookmarks');
    const bookmarkedIds = storedBookmarks ? (JSON.parse(storedBookmarks) as string[]) : [];
    const storedArticles = await AsyncStorage.getItem('paperboi_bookmarked_articles');
    const articles = storedArticles ? (JSON.parse(storedArticles) as Article[]) : [];
    return { bookmarkedIds, articles };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load bookmarked articles';
    return thunkApi.rejectWithValue(message);
  }
});

export const persistBookmarkedArticles = createAsyncThunk<
  { bookmarkedIds: string[] },
  { bookmarkedIds: string[]; articles: Article[] },
  { state: RootState }
>('news/persistBookmarked', async ({ bookmarkedIds, articles }, thunkApi) => {
  try {
    await persistBookmarks(bookmarkedIds);
    await AsyncStorage.setItem('paperboi_bookmarked_articles', JSON.stringify(articles));
    return { bookmarkedIds };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to persist bookmarks';
    return thunkApi.rejectWithValue(message);
  }
});
