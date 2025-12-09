import React from 'react';
import { render } from '@testing-library/react-native';
import NewsCard from '../../components/news/NewsCard';
import { Article } from '../../store/slices/newsSlice';

const article: Article = {
  id: '1',
  title: 'Sample article',
  summary: 'Summary',
  source: 'PaperBoi',
  publishedAt: new Date().toISOString(),
};

describe('NewsCard', () => {
  it('renders article details', () => {
    const { getByText } = render(
      <NewsCard
        article={article}
        onPress={() => {}}
        onSave={() => {}}
      />
    );

    expect(getByText('Sample article')).toBeTruthy();
  });
});
