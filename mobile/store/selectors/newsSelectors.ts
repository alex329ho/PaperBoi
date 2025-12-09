import { createSelector } from 'reselect';
import { RootState } from '../types';

export const selectNewsState = (state: RootState) => state.news;
export const selectArticles = (state: RootState) => state.news.articles;
export const selectBookmarkedIds = (state: RootState) => state.news.bookmarkedIds;
export const selectArticleById = (articleId: string) =>
  createSelector(selectArticles, (articles) => articles.find((article) => article.id === articleId));
export const selectSummaries = (state: RootState) => state.news.summaries;
export const selectIsNewsLoading = (state: RootState) => state.news.isLoading;
export const selectNewsFilter = (state: RootState) => state.news.filter;
export const selectPagination = (state: RootState) => state.news.pagination;
export const selectNewsError = (state: RootState) => state.news.error;
