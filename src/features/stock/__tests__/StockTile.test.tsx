/** @jsxImportSource @emotion/react */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StockTile } from '../components/StockTile';
import { ConfirmProvider } from '@/shared/ui/ConfirmDialog';
import { ToastProvider } from '@/shared/ui/Toast';
import type { StockSymbol, StockPrice } from '@/shared/types';

// useConfirm/useToast는 Provider 필요 — 모든 렌더를 래핑하는 헬퍼
const renderTile = (ui: React.ReactElement) =>
  render(<ToastProvider><ConfirmProvider>{ui}</ConfirmProvider></ToastProvider>);

vi.mock('../../../store/selectors', () => ({
  useTheme: () => ({ border: '#333', accent: '#4D9EFF', up: '#F04452', down: '#3182F6' }),
}));

const sym1: StockSymbol = { code: '005930', name: '삼성전자', market: 'KOSPI', nation: 'KR' };
const sym2: StockSymbol = { code: 'AAPL.O', name: 'Apple', market: 'NASDAQ', nation: 'US', reutersCode: 'AAPL.O' };

const makePrice = (code: string, name: string, overrides?: Partial<StockPrice>): StockPrice => ({
  code, name, nation: 'KR', market: 'KOSPI',
  currentPrice: 75_000, previousClose: 74_000,
  change: 1_000, changePercent: 1.35, changeDirection: 'up',
  currency: 'KRW', marketStatus: 'OPEN', updatedAt: '2024-01-01T09:00:00Z',
  isTradingHalt: false, exchange: 'KOSPI',
  ...overrides,
});

const prices: Record<string, StockPrice> = {
  '005930': makePrice('005930', '삼성전자', { changePercent: 2.5, changeDirection: 'up' }),
  'AAPL.O': makePrice('AAPL.O', 'Apple', { changePercent: -1.2, changeDirection: 'down', nation: 'US' }),
};

const baseProps = {
  symbols: [sym1, sym2],
  prices,
  currencyMode: 'KRW' as const,
  usdkrw: 1_380,
  onClick: vi.fn(),
  onDetail: vi.fn(),
};

describe('StockTile', () => {
  it('종목명을 렌더링한다', () => {
    renderTile(<StockTile {...baseProps} />);
    expect(screen.getByText('삼성전자')).toBeInTheDocument();
    // getDisplayName: 해외+영문이름 → p.code 반환
    expect(screen.getByText('AAPL.O')).toBeInTheDocument();
  });

  it('변동률에 부호를 표시한다', () => {
    const { container } = renderTile(<StockTile {...baseProps} />);
    expect(container.textContent).toContain('+2.50%');
    expect(container.textContent).toContain('-1.20%');
  });

  it('종목이 없으면 EmptyState를 표시한다', () => {
    renderTile(<StockTile {...baseProps} symbols={[]} />);
    expect(screen.getByText('종목을 추가해보세요')).toBeInTheDocument();
  });

  it('타일 클릭 → 팝오버 → 외부 링크 버튼 클릭 시 onClick이 호출된다', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderTile(<StockTile {...baseProps} onClick={onClick} />);
    // 타일 클릭하여 팝오버 열기
    await user.click(screen.getByText('삼성전자'));
    const linkBtn = screen.getByLabelText('외부 링크 열기');
    await user.click(linkBtn);
    expect(onClick).toHaveBeenCalledWith(sym1);
  });

  it('가격 없는 종목은 ··· 를 표시한다', () => {
    renderTile(<StockTile {...baseProps} prices={{}} />);
    const dots = screen.getAllByText('···');
    expect(dots.length).toBeGreaterThanOrEqual(1);
  });
});
