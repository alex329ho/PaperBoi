import newsReducer, { saveArticle, removeSavedArticle, NewsState } from '../../store/slices/newsSlice';

const baseState: NewsState = {
  articles: [],
  saved: [],
  loading: false,
};

describe('newsSlice', () => {
  it('saves and removes articles', () => {
    const saved = newsReducer(baseState, saveArticle({ id: '1', title: 't', summary: 's', source: 'src', publishedAt: 'now' } as any));
    expect(saved.saved).toHaveLength(1);

    const removed = newsReducer(saved, removeSavedArticle('1'));
    expect(removed.saved).toHaveLength(0);
  });
});
