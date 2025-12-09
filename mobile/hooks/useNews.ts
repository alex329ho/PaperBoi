import { useCallback, useEffect, useMemo } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Share } from 'react-native';
import { useAppDispatch, useAppSelector } from './useRedux';
import { useNetworkStatus } from './useNetworkStatus';
import {
  Article,
  FetchFeedParams,
  SearchParams,
  clearFeed,
  fetchFeed,
  removeSavedArticle,
  saveArticle,
  searchNews,
  setRecentSearches,
} from '../store/slices/newsSlice';
import { useAsyncStorage } from './useAsyncStorage';

const RECENT_SEARCHES_KEY = 'paperboi_recent_searches';
const SAVED_ARTICLES_KEY = 'paperboi_saved_articles';

export const useNews = () => {
  const dispatch = useAppDispatch();
  const { feed, search, saved } = useAppSelector((state) => state.news);
  const networkStatus = useNetworkStatus();
  const { update: persistRecentSearches } = useAsyncStorage<string[]>(RECENT_SEARCHES_KEY, []);
  const { update: persistSaved } = useAsyncStorage<Article[]>(SAVED_ARTICLES_KEY, []);

  useEffect(() => {
    persistSaved(saved);
  }, [persistSaved, saved]);

  const loadFeed = useCallback(
    (params?: FetchFeedParams) => {
      dispatch(fetchFeed(params ?? {}));
    },
    [dispatch]
  );

  const refreshFeed = useCallback(() => {
    dispatch(clearFeed());
    loadFeed({ page: 1 });
  }, [dispatch, loadFeed]);

  const loadMoreFeed = useCallback(() => {
    if (!feed.loading && feed.hasNextPage) {
      loadFeed({ page: feed.page + 1 });
    }
  }, [feed.hasNextPage, feed.loading, feed.page, loadFeed]);

  const executeSearch = useCallback(
    (params: SearchParams) => {
      dispatch(searchNews(params));
    },
    [dispatch]
  );

  const loadMoreResults = useCallback(() => {
    if (!search.loading && search.hasNextPage && search.query) {
      executeSearch({ query: search.query, page: search.page + 1 });
    }
  }, [executeSearch, search.hasNextPage, search.loading, search.page, search.query]);

  const saveRecent = useCallback(
    (recent: string[]) => {
      dispatch(setRecentSearches(recent));
      persistRecentSearches(recent);
    },
    [dispatch, persistRecentSearches]
  );

  const toggleBookmark = useCallback(
    (article: Article) => {
      const isSaved = saved.some((item) => item.id === article.id);
      if (isSaved) {
        dispatch(removeSavedArticle(article.id));
      } else {
        dispatch(saveArticle(article));
      }
    },
    [dispatch, saved]
  );

  const shareArticle = useCallback(async (article: Article) => {
    const message = `${article.title}\n${article.url ?? ''}`.trim();
    try {
      await Share.share({ message, title: article.title });
    } catch (error) {
      Alert.alert('Unable to share article');
    }
  }, []);

  const openExternal = useCallback(async (url?: string) => {
    if (!url) return;
    await WebBrowser.openBrowserAsync(url);
  }, []);

  useEffect(() => {
    loadFeed({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const offline = useMemo(() => (networkStatus ? !networkStatus.isConnected : false), [networkStatus]);

  return {
    feed,
    search,
    saved,
    offline,
    networkStatus,
    loadFeed,
    refreshFeed,
    loadMoreFeed,
    executeSearch,
    loadMoreResults,
    saveRecent,
    toggleBookmark,
    shareArticle,
    openExternal,
  } as const;
};

export default useNews;
