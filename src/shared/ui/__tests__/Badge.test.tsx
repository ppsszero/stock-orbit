/** @jsxImportSource @emotion/react */
import { render, screen } from '@testing-library/react';
import { Badge, StatusDot } from '../Badge';

describe('Badge', () => {
  it('children 텍스트를 렌더링한다', () => {
    render(<Badge bg="#3182F620" fg="#3182F6">KR</Badge>);
    expect(screen.getByText('KR')).toBeInTheDocument();
  });

  it('다양한 국가 코드를 렌더링할 수 있다', () => {
    const { rerender } = render(<Badge bg="#FF980020" fg="#E65100">US</Badge>);
    expect(screen.getByText('US')).toBeInTheDocument();

    rerender(<Badge bg="#F0445220" fg="#F04452">JP</Badge>);
    expect(screen.getByText('JP')).toBeInTheDocument();
  });

  it('거래소명 배지도 렌더링한다', () => {
    render(<Badge bg="#fff1" fg="#888">KOSPI</Badge>);
    expect(screen.getByText('KOSPI')).toBeInTheDocument();
  });
});

describe('StatusDot', () => {
  it('label 텍스트를 렌더링한다', () => {
    render(<StatusDot color="#00C853" label="LIVE" />);
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('거래정지 레이블도 렌더링한다', () => {
    render(<StatusDot color="#F04452" label="거래정지" />);
    expect(screen.getByText('거래정지')).toBeInTheDocument();
  });

  it('CLOSE 상태도 렌더링한다', () => {
    render(<StatusDot color="#888" label="CLOSE" />);
    expect(screen.getByText('CLOSE')).toBeInTheDocument();
  });
});
