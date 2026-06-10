/** @jsxImportSource @emotion/react */
import { render as rtlRender, screen, fireEvent } from '@testing-library/react';
import { GridCard } from '../components/GridCard';
import { ConfirmProvider } from '@/shared/ui/ConfirmDialog';
import { ToastProvider } from '@/shared/ui/Toast';
import type { StockSymbol, StockPrice } from '@/shared/types';

vi.mock('../../../store/selectors', () => ({
  useTheme: () => ({ border: '#333333', accent: '#4D9EFF', up: '#F04452', down: '#3182F6' }),
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
const renderCard = (ui: React.ReactElement) =>
  rtlRender(<ToastProvider><ConfirmProvider>{ui}</ConfirmProvider></ToastProvider>);

/* ── Tests ── */

describe('GridCard', () => {
  describe('기본 렌더링', () => {
    it('종목명과 코드를 표시한다', () => {
      renderCard(<GridCard {...baseProps} />);
      expect(screen.getByText('삼성전자')).toBeInTheDocument();
      expect(screen.getByText('005930')).toBeInTheDocument();
    });

    it('가격 데이터가 없으면 ··· 를 표시한다', () => {
      renderCard(<GridCard {...baseProps} price={undefined} />);
      expect(screen.getByText('···')).toBeInTheDocument();
    });
  });

  describe('등락 방향 표시', () => {
    it('상승 시 ▲ 와 + 부호를 표시한다', () => {
      const { container } = renderCard(
        <GridCard {...baseProps} price={makePrice({ changeDirection: 'up', changePercent: 1.35 })} />,
      );
      expect(container.textContent).toContain('▲');
      expect(container.textContent).toContain('+1.35%');
    });

    it('하락 시 ▼ 와 - 부호를 표시한다', () => {
      const { container } = renderCard(
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
      const { container } = renderCard(
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
    it('정규장이면 정규를 표시한다', () => {
      renderCard(<GridCard {...baseProps} price={makePrice({ marketStatus: 'REGULAR' })} />);
      expect(screen.getByText('정규')).toBeInTheDocument();
    });

    it('장마감이면 장마감을 표시한다', () => {
      renderCard(<GridCard {...baseProps} price={makePrice({ marketStatus: 'CLOSED' })} />);
      expect(screen.getByText('장마감')).toBeInTheDocument();
    });
  });

  // 액션은 호버 버튼 → 우클릭 컨텍스트 메뉴로 변경됨. 카드 클릭은 웹뷰 열기(onClick).
  describe('상호작용', () => {
    it('카드 클릭 시 onClick이 심볼과 함께 호출된다', () => {
      const onClick = vi.fn();
      renderCard(<GridCard {...baseProps} onClick={onClick} />);
      fireEvent.click(screen.getByText('삼성전자'));
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledWith(sym);
    });

    it('우클릭 시 컨텍스트 메뉴(상세 정보 보기/삭제)를 표시한다', () => {
      renderCard(<GridCard {...baseProps} />);
      fireEvent.contextMenu(screen.getByText('삼성전자'));
      expect(screen.getByText('상세 정보 보기')).toBeInTheDocument();
      expect(screen.getByText('삭제')).toBeInTheDocument();
    });

    it('메뉴의 상세 정보 보기 클릭 시 onDetail이 심볼과 가격과 함께 호출된다', () => {
      const onDetail = vi.fn();
      const price = makePrice();
      renderCard(<GridCard {...baseProps} price={price} onDetail={onDetail} />);
      fireEvent.contextMenu(screen.getByText('삼성전자'));
      fireEvent.click(screen.getByText('상세 정보 보기'));
      expect(onDetail).toHaveBeenCalledTimes(1);
      expect(onDetail).toHaveBeenCalledWith(sym, price);
    });
  });
});
