/** @jsxImportSource @emotion/react */
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StockRow } from '../components/StockRow';
import type { StockSymbol, StockPrice } from '@/shared/types';

vi.mock('../../../store/selectors', () => ({
  useTheme: () => ({ border: '#333333', accent: '#4D9EFF' }),
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

describe('StockRow', () => {
  describe('기본 렌더링', () => {
    it('종목명과 코드를 표시한다', () => {
      render(<StockRow {...baseProps} />);
      expect(screen.getByText('삼성전자')).toBeInTheDocument();
      expect(screen.getByText('005930')).toBeInTheDocument();
    });

    it('가격 데이터가 없으면 ··· 를 표시한다', () => {
      render(<StockRow {...baseProps} price={undefined} />);
      expect(screen.getByText('···')).toBeInTheDocument();
    });

    it('role="listitem" 을 가진다', () => {
      render(<StockRow {...baseProps} />);
      expect(screen.getByRole('listitem')).toBeInTheDocument();
    });
  });

  describe('등락 방향 표시 — 이 버그가 국내주식에서 반전되었었음', () => {
    it('changeDirection이 up이면 ▲ 화살표를 표시한다', () => {
      render(<StockRow {...baseProps} price={makePrice({ changeDirection: 'up' })} />);
      expect(screen.getByRole('listitem')).toHaveTextContent('▲');
    });

    it('changeDirection이 down이면 ▼ 화살표를 표시한다', () => {
      render(
        <StockRow
          {...baseProps}
          price={makePrice({ changeDirection: 'down', change: -1_000, changePercent: -1.35 })}
        />,
      );
      expect(screen.getByRole('listitem')).toHaveTextContent('▼');
      expect(screen.getByRole('listitem')).not.toHaveTextContent('▲');
    });

    it('changeDirection이 flat이면 화살표를 표시하지 않는다', () => {
      render(
        <StockRow
          {...baseProps}
          price={makePrice({ changeDirection: 'flat', change: 0, changePercent: 0 })}
        />,
      );
      expect(screen.getByRole('listitem')).not.toHaveTextContent('▲');
      expect(screen.getByRole('listitem')).not.toHaveTextContent('▼');
    });

    it('상승 시 변동률에 + 부호를 표시한다', () => {
      render(<StockRow {...baseProps} price={makePrice({ changeDirection: 'up', changePercent: 1.35 })} />);
      expect(screen.getByRole('listitem')).toHaveTextContent('+1.35%');
    });

    it('하락 시 변동률에 - 부호를 표시한다', () => {
      render(
        <StockRow
          {...baseProps}
          price={makePrice({ changeDirection: 'down', change: -1_000, changePercent: -1.35 })}
        />,
      );
      expect(screen.getByRole('listitem')).toHaveTextContent('-1.35%');
    });
  });

  describe('시장 상태 표시', () => {
    it('OPEN 시장이면 LIVE 상태를 표시한다', () => {
      render(<StockRow {...baseProps} price={makePrice({ marketStatus: 'OPEN' })} />);
      expect(screen.getByText('LIVE')).toBeInTheDocument();
    });

    it('CLOSE 시장이면 CLOSE 상태를 표시한다', () => {
      render(<StockRow {...baseProps} price={makePrice({ marketStatus: 'CLOSE' })} />);
      expect(screen.getByText('CLOSE')).toBeInTheDocument();
    });

    it('거래정지 종목이면 거래정지 레이블을 표시한다', () => {
      render(<StockRow {...baseProps} price={makePrice({ isTradingHalt: true })} />);
      expect(screen.getByText('거래정지')).toBeInTheDocument();
      expect(screen.queryByText('LIVE')).not.toBeInTheDocument();
    });
  });

  describe('통화 모드', () => {
    it('KRW 모드에서 ₩ 접두사를 표시한다', () => {
      render(<StockRow {...baseProps} price={makePrice({ currency: 'KRW' })} currencyMode="KRW" />);
      expect(screen.getByRole('listitem')).toHaveTextContent('₩');
    });

    it('USD 모드에서 해외주식은 $ 접두사를 표시한다', () => {
      const usSym: StockSymbol = { code: 'AAPL', name: 'Apple', market: 'NASDAQ', nation: 'US', reutersCode: 'AAPL.O' };
      const usPrice = makePrice({ currency: 'USD', currentPrice: 195.5, change: 1.5, changePercent: 0.77 });
      render(<StockRow {...baseProps} sym={usSym} price={usPrice} currencyMode="USD" />);
      expect(screen.getByRole('listitem')).toHaveTextContent('$');
    });
  });

  describe('호버 액션', () => {
    it('마우스를 올리면 삭제/차트/링크 버튼이 나타난다', async () => {
      const user = userEvent.setup();
      render(<StockRow {...baseProps} />);
      await user.hover(screen.getByRole('listitem'));
      expect(screen.getByRole('button', { name: '종목 삭제' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '차트 보기' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '외부 링크 열기' })).toBeInTheDocument();
    });

    it('삭제 버튼 클릭 시 onRemove가 종목 코드와 함께 호출된다', () => {
      const onRemove = vi.fn();
      render(<StockRow {...baseProps} onRemove={onRemove} />);
      fireEvent.mouseEnter(screen.getByRole('listitem'));
      fireEvent.click(screen.getByRole('button', { name: '종목 삭제' }));
      expect(onRemove).toHaveBeenCalledTimes(1);
      expect(onRemove).toHaveBeenCalledWith('005930');
    });

    it('외부 링크 버튼 클릭 시 onClick이 심볼 객체와 함께 호출된다', () => {
      const onClick = vi.fn();
      render(<StockRow {...baseProps} onClick={onClick} />);
      fireEvent.mouseEnter(screen.getByRole('listitem'));
      fireEvent.click(screen.getByRole('button', { name: '외부 링크 열기' }));
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledWith(sym);
    });

    it('상세 버튼 클릭 시 onDetail이 심볼과 가격 데이터와 함께 호출된다', () => {
      const onDetail = vi.fn();
      const price = makePrice();
      render(<StockRow {...baseProps} price={price} onDetail={onDetail} />);
      fireEvent.mouseEnter(screen.getByRole('listitem'));
      fireEvent.click(screen.getByRole('button', { name: '상세 보기' }));
      expect(onDetail).toHaveBeenCalledTimes(1);
      expect(onDetail).toHaveBeenCalledWith(sym, price);
    });
  });
});
