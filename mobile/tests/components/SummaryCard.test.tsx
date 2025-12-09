import React from 'react';
import { render } from '@testing-library/react-native';
import SummaryCard from '@components/summary/SummaryCard';

describe('SummaryCard', () => {
  it('shows title and summary', () => {
    const { getByText } = render(<SummaryCard title="Hello" summary="World" />);
    expect(getByText('Hello')).toBeTruthy();
    expect(getByText('World')).toBeTruthy();
  });
});
