/** @jsxImportSource @emotion/react */
import { render, screen, fireEvent } from '@testing-library/react';
import { GridCard } from '../components/GridCard';
import type { StockSymbol, StockPrice } from '@/shared/types';

vi.mock('../../../store/selectors', () => ({
  useTheme: () => ({ border: '#333333', accent: '#4D9EFF', up: '#F04452', down: '#3182F6' }),
}));

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {}, listeners: {}, setNodeRef: () => {},
    transform: null, transition: null, isDragging: false,
  }),
}));

/* ── Fixtures ── */

const sym: StockSymbol = {
  code: '005930',
  name: '삼성전자',
  market: 'KOSPI',
  nation: 'KR',
};

const makePrice = (overrides?: Partial<StockPrice>): StockPrice => ({
  code: '005930',
  name: '삼성전자',
  nation: 'KR',
  market: 'KOSPI',
  currentPrice: 75_000,
  previousClose: 74_000,
  change: 1_000,
  changePercent: 1.35,
  changeDirection: 'up',
  currency: 'KRW',
  marketStatus: 'OPEN',
  updatedAt: '2024-01-01T09:00:00Z',
  isTradingHalt: false,
  exchange: 'KOSPI',
  ...overrides,
});

const baseProps = {
  sym,
  price: makePrice(),
  currencyMode: 'KRW' as const,
  usdkrw: 1_380,
  onRemove: vi.fn(),
  onClick: vi.fn(),
  onDetail: vi.fn(),
};

/* ── Tests ── */

describe('GridCard', () => {
  describe('기본 렌더링', () => {
    it('종목명과 코드를 표시한다', () => {
      render(<GridCard {...baseProps} />);
      expect(screen.getByText('삼성전자')).toBeInTheDocument();
      expect(screen.getByText('005930')).toBeInTheDocument();
    });

    it('가격 데이터가 없으면 ··· 를 표시한다', () => {
      render(<GridCard {...baseProps} price={undefined} />);
      expect(screen.getByText('···')).toBeInTheDocument();
    });
  });

  describe('등락 방향 표시', () => {
    it('상승 시 ▲ 와 + 부호를 표시한다', () => {
      const { container } = render(
        <GridCard {...baseProps} price={makePrice({ changeDirection: 'up', changePercent: 1.35 })} />,
      );
      expect(container.textContent).toContain('▲');
      expect(container.textContent).toContain('+1.35%');
    });

    it('하락 시 ▼ 와 - 부호를 표시한다', () => {
      const { container } = render(
        <GridCard
          {...baseProps}
          price={makePrice({ changeDirection: 'down', change: -1_000, changePercent: -1.35 })}
        />,
      );
      expect(container.textContent).toContain('▼');
      expect(container.textContent).toContain('-1.35%');
      expect(container.textContent).not.toContain('▲');
    });

    it('보합 시 화살표를 표시하지 않는다', () => {
      const { container } = render(
        <GridCard
          {...baseProps}
          price={makePrice({ changeDirection: 'flat', change: 0, changePercent: 0 })}
        />,
      );
      expect(container.textContent).not.toContain('▲');
      expect(container.textContent).not.toContain('▼');
    });
  });

  describe('시장 상태 표시', () => {
    it('OPEN 시장이면 LIVE를 표시한다', () => {
      render(<GridCard {...baseProps} price={makePrice({ marketStatus: 'OPEN' })} />);
      expect(screen.getByText('LIVE')).toBeInTheDocument();
    });

    it('CLOSE 시장이면 CLOSE를 표시한다', () => {
      render(<GridCard {...baseProps} price={makePrice({ marketStatus: 'CLOSE' })} />);
      expect(screen.getByText('CLOSE')).toBeInTheDocument();
    });
  });

  describe('카드 클릭은 웹뷰를 열지 않는다', () => {
    it('카드 자체를 클릭해도 onClick이 호출되지 않는다', () => {
      const onClick = vi.fn();
      const { container } = render(<GridCard {...baseProps} onClick={onClick} />);
      fireEvent.click(container.firstChild!);
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('호버 액션 버튼', () => {
    it('외부 링크, 차트, 삭제 버튼이 존재한다', () => {
      render(<GridCard {...baseProps} />);
      expect(screen.getByRole('button', { name: '외부 링크 열기' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '차트 보기' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '종목 삭제' })).toBeInTheDocument();
    });

    it('외부 링크 버튼 클릭 시 onClick이 심볼과 함께 호출된다', () => {
      const onClick = vi.fn();
      render(<GridCard {...baseProps} onClick={onClick} />);
      fireEvent.click(screen.getByRole('button', { name: '외부 링크 열기' }));
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledWith(sym);
    });

    it('차트 버튼 클릭 시 onDetail이 호출된다', () => {
      const onDetail = vi.fn();
      const price = makePrice();
      render(<GridCard {...baseProps} price={price} onDetail={onDetail} />);
      fireEvent.click(screen.getByRole('button', { name: '차트 보기' }));
      expect(onDetail).toHaveBeenCalledTimes(1);
      expect(onDetail).toHaveBeenCalledWith(sym, price);
    });

    it('삭제 버튼 클릭 시 onRemove가 종목 코드와 함께 호출된다', () => {
      const onRemove = vi.fn();
      render(<GridCard {...baseProps} onRemove={onRemove} />);
      fireEvent.click(screen.getByRole('button', { name: '종목 삭제' }));
      expect(onRemove).toHaveBeenCalledTimes(1);
      expect(onRemove).toHaveBeenCalledWith('005930');
    });

    it('가격 없으면 차트 버튼이 숨겨진다', () => {
      render(<GridCard {...baseProps} price={undefined} />);
      expect(screen.queryByRole('button', { name: '차트 보기' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: '외부 링크 열기' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '종목 삭제' })).toBeInTheDocument();
    });
  });
});
