import newsReducer, {
  saveArticle,
  removeSavedArticle,
  NewsState,
} from '../../store/slices/newsSlice';

const baseState: NewsState = {
  articles: [],
  summaries: {},
  bookmarkedIds: [],
  saved: [],
  recentSearches: [],
  filter: { topics: [], regions: [], languages: [], sortBy: 'recent' },
  pagination: { page: 1, total: 0, limit: 20 },
  isLoading: false,
  loading: false,
  error: null,
  lastFetch: null,
};

describe('newsSlice', () => {
  it('saves and removes articles', () => {
    const saved = newsReducer(
      baseState,
      saveArticle({
        id: '1',
        title: 't',
        content: 'c',
        summary: 's',
        topic: 'general',
        region: 'US',
        language: 'en',
        source: 'src',
        publishedAt: 'now',
        createdAt: 'now',
      } as any),
    );
    expect(saved.saved).toHaveLength(1);

    const removed = newsReducer(saved, removeSavedArticle('1'));
    expect(removed.saved).toHaveLength(0);
  });
});
