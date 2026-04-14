/** @jsxImportSource @emotion/react */
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../components/EmptyState';

describe('EmptyState', () => {
  it('안내 메시지를 렌더링한다', () => {
    render(<EmptyState />);
    expect(screen.getByText('종목을 추가해보세요')).toBeInTheDocument();
    expect(screen.getByText('아래 검색창에서 종목을 검색하세요')).toBeInTheDocument();
  });
});
