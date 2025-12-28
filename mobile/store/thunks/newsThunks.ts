import { createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../services/endpoints';
import { extractApiData, extractPagination } from '../../utils/api';
import { addPendingAction } from '../slices/syncSlice';
import { Article, ArticleReport, FilterState, PaginationState, RootState } from '../types';

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

const DEFAULT_HOURS = 168;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toCsv = (values?: string[]) =>
  values && values.length ? values.join(',') : undefined;

const buildListParams = (filter: FilterState, page: number, limit: number) => ({
  hours: DEFAULT_HOURS,
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
    const response = await apiClient.get<unknown>(API_ENDPOINTS.news.list, {
      params: buildListParams(filter, page, limit),
    });
    const responseData = response.data;
    const payload = extractApiData<unknown>(responseData);
    const pagination = extractPagination(responseData);
    const articles = Array.isArray(payload)
      ? (payload as Article[])
      : isRecord(payload) && Array.isArray(payload.articles)
        ? (payload.articles as Article[])
        : [];
    const limitFromApi =
      pagination?.limit ??
      (isRecord(payload) && typeof payload.limit === 'number' ? payload.limit : undefined) ??
      limit;
    const offsetFromApi =
      pagination?.offset ??
      (isRecord(payload) && typeof payload.offset === 'number' ? payload.offset : undefined);
    const pageFromApi =
      typeof offsetFromApi === 'number' && typeof limitFromApi === 'number'
        ? Math.floor(offsetFromApi / limitFromApi) + 1
        : (isRecord(payload) && typeof payload.page === 'number' ? payload.page : page);
    return {
      articles: (articles ?? []) as Article[],
      pagination: {
        page: pageFromApi,
        total:
          pagination?.total ??
          (isRecord(payload) && typeof payload.total === 'number' ? payload.total : undefined) ??
          articles.length ??
          0,
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
      const response = await apiClient.get<unknown>(API_ENDPOINTS.news.detail(articleId));
      const payload = extractApiData<Article>(response.data);
      return payload;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error fetching article';
      return thunkApi.rejectWithValue(message);
    }
  },
);

export const generateSummary = createAsyncThunk<
  { id: string; summary: string; report?: ArticleReport },
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
    const payload = extractApiData<Record<string, unknown>>(response.data);
    const summary =
      (typeof payload.summary === 'string' && payload.summary) ||
      (typeof payload.summary_text === 'string' && payload.summary_text) ||
      (typeof payload.summaryText === 'string' && payload.summaryText) ||
      '';
    const report = payload.report && typeof payload.report === 'object' ? (payload.report as ArticleReport) : undefined;
    return { id: articleId, summary: summary as string, report };
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
    const response = await apiClient.post<unknown>(API_ENDPOINTS.news.search, payload);
    const payloadData = extractApiData<unknown>(response.data);
    const articles = Array.isArray(payloadData)
      ? (payloadData as Article[])
      : isRecord(payloadData) && Array.isArray(payloadData.articles)
        ? (payloadData.articles as Article[])
        : [];
    return {
      articles: (articles ?? []) as Article[],
      pagination: {
        page:
          (isRecord(payloadData) && typeof payloadData.page === 'number'
            ? payloadData.page
            : 1),
        total:
          (isRecord(payloadData) && typeof payloadData.total === 'number'
            ? payloadData.total
            : undefined) ?? articles.length ?? 0,
        limit:
          (isRecord(payloadData) && typeof payloadData.limit === 'number'
            ? payloadData.limit
            : undefined) ?? getState().news.pagination.limit,
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
