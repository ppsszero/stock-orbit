/** @jsxImportSource @emotion/react */
import { render as rtlRender, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StockRow } from '../components/StockRow';
import { ConfirmProvider } from '@/shared/ui/ConfirmDialog';
import { ToastProvider } from '@/shared/ui/Toast';
import type { StockSymbol, StockPrice } from '@/shared/types';

vi.mock('../../../store/selectors', () => ({
  useTheme: () => ({ border: '#333333', accent: '#4D9EFF' }),
}));

vi.mock('@dnd-kit/sortable', async (importOriginal) => ({ ...(await importOriginal()),
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
  marketStatus: 'REGULAR',
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

// useSymbolRemove(useConfirm/useToast) → Provider 래핑
const renderRow = (ui: React.ReactElement) =>
  rtlRender(<ToastProvider><ConfirmProvider>{ui}</ConfirmProvider></ToastProvider>);

/* ── Tests ── */

describe('StockRow', () => {
  describe('기본 렌더링', () => {
    it('종목명과 코드를 표시한다', () => {
      renderRow(<StockRow {...baseProps} />);
      expect(screen.getByText('삼성전자')).toBeInTheDocument();
      expect(screen.getByText('005930')).toBeInTheDocument();
    });

    it('가격 데이터가 없으면 ··· 를 표시한다', () => {
      renderRow(<StockRow {...baseProps} price={undefined} />);
      expect(screen.getByText('···')).toBeInTheDocument();
    });

    it('role="listitem" 을 가진다', () => {
      renderRow(<StockRow {...baseProps} />);
      expect(screen.getByRole('listitem')).toBeInTheDocument();
    });
  });

  describe('등락 방향 표시 — 이 버그가 국내주식에서 반전되었었음', () => {
    it('changeDirection이 up이면 ▲ 화살표를 표시한다', () => {
      renderRow(<StockRow {...baseProps} price={makePrice({ changeDirection: 'up' })} />);
      expect(screen.getByRole('listitem')).toHaveTextContent('▲');
    });

    it('changeDirection이 down이면 ▼ 화살표를 표시한다', () => {
      renderRow(
        <StockRow
          {...baseProps}
          price={makePrice({ changeDirection: 'down', change: -1_000, changePercent: -1.35 })}
        />,
      );
      expect(screen.getByRole('listitem')).toHaveTextContent('▼');
      expect(screen.getByRole('listitem')).not.toHaveTextContent('▲');
    });

    it('changeDirection이 flat이면 화살표를 표시하지 않는다', () => {
      renderRow(
        <StockRow
          {...baseProps}
          price={makePrice({ changeDirection: 'flat', change: 0, changePercent: 0 })}
        />,
      );
      expect(screen.getByRole('listitem')).not.toHaveTextContent('▲');
      expect(screen.getByRole('listitem')).not.toHaveTextContent('▼');
    });

    it('상승 시 변동률에 + 부호를 표시한다', () => {
      renderRow(<StockRow {...baseProps} price={makePrice({ changeDirection: 'up', changePercent: 1.35 })} />);
      expect(screen.getByRole('listitem')).toHaveTextContent('+1.35%');
    });

    it('하락 시 변동률에 - 부호를 표시한다', () => {
      renderRow(
        <StockRow
          {...baseProps}
          price={makePrice({ changeDirection: 'down', change: -1_000, changePercent: -1.35 })}
        />,
      );
      expect(screen.getByRole('listitem')).toHaveTextContent('-1.35%');
    });
  });

  describe('시장 상태 표시', () => {
    it('정규장이면 정규 상태를 표시한다', () => {
      renderRow(<StockRow {...baseProps} price={makePrice({ marketStatus: 'REGULAR' })} />);
      expect(screen.getByText('정규')).toBeInTheDocument();
    });

    it('장마감이면 장마감 상태를 표시한다', () => {
      renderRow(<StockRow {...baseProps} price={makePrice({ marketStatus: 'CLOSED' })} />);
      expect(screen.getByText('장마감')).toBeInTheDocument();
    });

    it('거래정지 종목이면 거래정지 레이블을 표시한다', () => {
      renderRow(<StockRow {...baseProps} price={makePrice({ isTradingHalt: true })} />);
      expect(screen.getByText('거래정지')).toBeInTheDocument();
      expect(screen.queryByText('정규')).not.toBeInTheDocument();
    });
  });

  describe('통화 모드', () => {
    it('KRW 모드에서 ₩ 접두사를 표시한다', () => {
      renderRow(<StockRow {...baseProps} price={makePrice({ currency: 'KRW' })} currencyMode="KRW" />);
      expect(screen.getByRole('listitem')).toHaveTextContent('₩');
    });

    it('USD 모드에서 해외주식은 $ 접두사를 표시한다', () => {
      const usSym: StockSymbol = { code: 'AAPL', name: 'Apple', market: 'NASDAQ', nation: 'US', reutersCode: 'AAPL.O' };
      const usPrice = makePrice({ currency: 'USD', currentPrice: 195.5, change: 1.5, changePercent: 0.77 });
      renderRow(<StockRow {...baseProps} sym={usSym} price={usPrice} currencyMode="USD" />);
      expect(screen.getByRole('listitem')).toHaveTextContent('$');
    });
  });

  // 액션은 호버 버튼 → 우클릭 컨텍스트 메뉴로 변경됨. 행 클릭은 웹뷰 열기(onClick).
  describe('상호작용', () => {
    it('행 클릭 시 onClick이 심볼과 함께 호출된다', () => {
      const onClick = vi.fn();
      renderRow(<StockRow {...baseProps} onClick={onClick} />);
      fireEvent.click(screen.getByRole('listitem'));
      expect(onClick).toHaveBeenCalledTimes(1);
      // price 동봉 — 부모가 데이마켓 세션 여부로 웹뷰 소스 결정
      expect(onClick).toHaveBeenCalledWith(sym, baseProps.price);
    });

    it('우클릭 시 컨텍스트 메뉴(상세 정보 보기/삭제)를 표시한다', () => {
      renderRow(<StockRow {...baseProps} />);
      fireEvent.contextMenu(screen.getByRole('listitem'));
      expect(screen.getByText('상세 정보 보기')).toBeInTheDocument();
      expect(screen.getByText('삭제')).toBeInTheDocument();
    });

    it('메뉴의 상세 정보 보기 클릭 시 onDetail이 심볼과 가격과 함께 호출된다', () => {
      const onDetail = vi.fn();
      const price = makePrice();
      renderRow(<StockRow {...baseProps} price={price} onDetail={onDetail} />);
      fireEvent.contextMenu(screen.getByRole('listitem'));
      fireEvent.click(screen.getByText('상세 정보 보기'));
      expect(onDetail).toHaveBeenCalledTimes(1);
      expect(onDetail).toHaveBeenCalledWith(sym, price);
    });
  });
});
