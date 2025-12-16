import React from 'react';
import { render } from '@testing-library/react-native';
import NewsCard from '../../components/news/NewsCard';
import { Article } from '../../store/slices/newsSlice';

const article: Article = {
  id: '1',
  title: 'Sample article',
  summary: 'Summary',
  content: 'Content',
  topic: 'Tech',
  region: 'US',
  language: 'en',
  source: 'PaperBoi',
  publishedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
};

describe('NewsCard', () => {
  it('renders article details', () => {
    const { getByText } = render(
      <NewsCard article={article} onPress={() => {}} onBookmark={() => {}} onShare={() => {}} />,
    );

    expect(getByText('Sample article')).toBeTruthy();
  });
});
