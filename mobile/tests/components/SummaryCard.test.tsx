import React from 'react';
import { render } from '@testing-library/react-native';
import SummaryCard from '../../components/summary/SummaryCard';

describe('SummaryCard', () => {
  it('shows summary text', () => {
    const { getByText } = render(<SummaryCard title="Title" summary="Summary content" />);
    expect(getByText('Summary content')).toBeTruthy();
  });
});
