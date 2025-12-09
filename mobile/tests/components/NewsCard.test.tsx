import React from 'react';
import { render } from '@testing-library/react-native';
import NewsCard from '@components/news/NewsCard';
import { Article } from '@store/slices/newsSlice';

describe('NewsCard', () => {
  const article: Article = {
    id: '1',
    title: 'Breaking News',
    summary: 'Summary of breaking news',
    content: 'Full content',
    publishedAt: new Date().toISOString()
  };

  it('renders article title', () => {
    const { getByText } = render(<NewsCard article={article} />);
    expect(getByText('Breaking News')).toBeTruthy();
  });
});
