import { PayloadAction } from '@reduxjs/toolkit';

// Shared domain types
export type NetworkStatus = 'online' | 'offline' | 'slow';

export type UserProfile = {
  id: string;
  email: string;
  name: string;
};

export type Article = {
  id: string;
  title: string;
  content: string;
  topic: string;
  region: string;
  language: string;
  createdAt: string;
  updatedAt?: string;
  author?: string;
};

export type PaginationState = {
  page: number;
  total: number;
  limit: number;
};

export type FilterState = {
  topics: string[];
  regions: string[];
  languages: string[];
  sortBy: 'recent' | 'trending' | 'relevance';
};

export type Toast = {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  duration?: number;
};

export type AuthState = {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
};

export type NewsState = {
  articles: Article[];
  summaries: Record<string, string>;
  bookmarkedIds: string[];
  filter: FilterState;
  pagination: PaginationState;
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;
};

export type PreferencesState = {
  topics: string[];
  regions: string[];
  languages: string[];
  notificationEnabled: boolean;
  notificationTime: string;
  summaryLength: 'SHORT' | 'MEDIUM' | 'LONG';
  emailFrequency: 'daily' | 'weekly' | 'never';
  isLoading: boolean;
  error: string | null;
};

export type UIState = {
  theme: 'light' | 'dark';
  isOffline: boolean;
  toasts: Toast[];
  networkStatus: NetworkStatus;
};

export type SyncPendingAction = {
  id: string;
  actionType: string;
  args: unknown;
  attempt: number;
  critical?: boolean;
  createdAt: number;
  lastError?: string;
};

export type SyncState = {
  pendingActions: SyncPendingAction[];
  isSync: boolean;
  lastSync: number | null;
  syncError: string | null;
};

export type KnownAction = PayloadAction<unknown> & { type: string };

export type RootState = {
  auth: AuthState;
  news: NewsState;
  preferences: PreferencesState;
  ui: UIState;
  sync: SyncState;
};
