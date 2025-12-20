import { createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../services/endpoints';
import { addPendingAction } from '../slices/syncSlice';
import { Article, FilterState, PaginationState, RootState } from '../types';

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

const toCsv = (values?: string[]) =>
  values && values.length ? values.join(',') : undefined;

const buildListParams = (filter: FilterState, page: number, limit: number) => ({
  offset: Math.max(0, (page - 1) * limit),
  limit,
  sort: filter.sortBy,
  topics: toCsv(filter.topics),
  regions: toCsv(filter.regions),
  languages: toCsv(filter.languages),
});

const buildSearchPayload = (query: string, filter: FilterState, startDate?: string, endDate?: string) => ({
  query,
  topics: filter.topics,
  regions: filter.regions,
  languages: filter.languages,
  start_date: startDate,
  end_date: endDate,
  sort_by: filter.sortBy,
});

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
  try {
    const response = await apiClient.get(API_ENDPOINTS.news.list, {
      params: buildListParams(filter, page, limit),
    });
    const payload = (response.data as any)?.data ?? response.data;
    const pagination = (response.data as any)?.pagination ?? payload?.pagination;
    const articles = Array.isArray(payload) ? payload : payload.articles;
    const limitFromApi = pagination?.limit ?? payload?.limit ?? limit;
    const offsetFromApi = pagination?.offset ?? payload?.offset;
    const pageFromApi =
      typeof offsetFromApi === 'number' && typeof limitFromApi === 'number'
        ? Math.floor(offsetFromApi / limitFromApi) + 1
        : payload?.page ?? page;
    return {
      articles: (articles ?? []) as Article[],
      pagination: {
        page: pageFromApi,
        total: pagination?.total ?? payload?.total ?? articles?.length ?? 0,
        limit: limitFromApi,
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
      const response = await apiClient.get(API_ENDPOINTS.news.detail(articleId));
      const payload = (response.data as any)?.data ?? response.data;
      return payload as Article;
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
    const response = await apiClient.post(API_ENDPOINTS.news.detail(articleId) + '/summarize', {
      length,
    });
    const payload = (response.data as any)?.data ?? response.data;
    const summary = payload?.summary ?? payload?.summary_text ?? payload?.summaryText;
    return { id: articleId, summary: summary as string };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error generating summary';
    return thunkApi.rejectWithValue(message);
  }
});

export const searchNews = createAsyncThunk<
  { articles: Article[]; pagination: PaginationState },
  { query: string; filter?: FilterState; startDate?: string; endDate?: string },
  { state: RootState }
>('news/searchNews', async ({ query, filter, startDate, endDate }, thunkApi) => {
  const { getState } = thunkApi;
  if (getState().ui.networkStatus === 'offline') {
    return enqueueWhenOffline(thunkApi, 'news/searchNews', { query, filter });
  }

  try {
    const payload = buildSearchPayload(
      query,
      filter ?? getState().news.filter,
      startDate,
      endDate,
    );
    const response = await apiClient.post(API_ENDPOINTS.news.search, payload);
    const payloadData = (response.data as any)?.data ?? response.data;
    const articles = Array.isArray(payloadData) ? payloadData : payloadData.articles;
    return {
      articles: (articles ?? []) as Article[],
      pagination: {
        page: payloadData.page ?? 1,
        total: payloadData.total ?? articles?.length ?? 0,
        limit: payloadData.limit ?? getState().news.pagination.limit,
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
