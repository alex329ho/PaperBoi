import newsReducer, { addSaved, Article, removeSaved, setArticles } from '@store/slices/newsSlice';

describe('newsSlice', () => {
  const initialState = { articles: [], saved: [], isLoading: false };
  const article: Article = {
    id: '1',
    title: 'Test',
    summary: 'Summary',
    content: 'Content',
    publishedAt: 'today'
  };

  it('sets articles', () => {
    const state = newsReducer(initialState, setArticles([article]));
    expect(state.articles).toHaveLength(1);
  });

  it('adds and removes saved', () => {
    const savedState = newsReducer(initialState, addSaved(article));
    expect(savedState.saved).toHaveLength(1);
    const removed = newsReducer(savedState, removeSaved('1'));
    expect(removed.saved).toHaveLength(0);
  });
});
