/** @jsxImportSource @emotion/react */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StockDetailModal } from '../components/StockDetailModal';
import type { StockSymbol, StockPrice } from '@/shared/types';

const sym: StockSymbol = { code: '005930', name: '삼성전자', market: 'KOSPI', nation: 'KR' };

const price: StockPrice = {
  code: '005930', name: '삼성전자', nation: 'KR', market: 'KOSPI',
  currentPrice: 75_000, previousClose: 74_000,
  change: 1_000, changePercent: 1.35, changeDirection: 'up',
  currency: 'KRW', marketStatus: 'OPEN', updatedAt: '2024-01-01T09:00:00Z',
  isTradingHalt: false, exchange: 'KOSPI',
  openPrice: 74_500, highPrice: 76_000, lowPrice: 73_500,
  volume: '12,345,678', tradingValue: '9,234억', marketCap: '448.3조',
  per: '12.5', pbr: '1.3',
  week52High: 80_000, week52Low: 60_000,
};

describe('StockDetailModal', () => {
  it('symbol/price가 null이면 렌더링하지 않는다', () => {
    const { container } = render(<StockDetailModal symbol={null} price={null} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('종목명과 코드를 표시한다', () => {
    render(<StockDetailModal symbol={sym} price={price} onClose={vi.fn()} />);
    expect(screen.getByText('삼성전자')).toBeInTheDocument();
    expect(screen.getByText('005930')).toBeInTheDocument();
  });

  it('현재가와 변동률을 표시한다', () => {
    const { container } = render(<StockDetailModal symbol={sym} price={price} onClose={vi.fn()} />);
    expect(container.textContent).toContain('+1.35%');
  });

  it('가격 정보 섹션을 표시한다', () => {
    render(<StockDetailModal symbol={sym} price={price} onClose={vi.fn()} />);
    expect(screen.getByText('가격 정보')).toBeInTheDocument();
    expect(screen.getByText('시가')).toBeInTheDocument();
    expect(screen.getByText('고가')).toBeInTheDocument();
    expect(screen.getByText('저가')).toBeInTheDocument();
    expect(screen.getByText('전일종가')).toBeInTheDocument();
  });

  it('거래 정보 섹션을 표시한다', () => {
    render(<StockDetailModal symbol={sym} price={price} onClose={vi.fn()} />);
    expect(screen.getByText('거래 정보')).toBeInTheDocument();
    expect(screen.getByText('거래량')).toBeInTheDocument();
    expect(screen.getByText('시가총액')).toBeInTheDocument();
  });

  it('투자 지표 섹션을 표시한다', () => {
    render(<StockDetailModal symbol={sym} price={price} onClose={vi.fn()} />);
    expect(screen.getByText('투자 지표')).toBeInTheDocument();
    expect(screen.getByText('PER')).toBeInTheDocument();
    expect(screen.getByText('PBR')).toBeInTheDocument();
    expect(screen.getByText('52주 최고')).toBeInTheDocument();
    expect(screen.getByText('52주 최저')).toBeInTheDocument();
  });

  it('LIVE 시장 상태를 표시한다', () => {
    render(<StockDetailModal symbol={sym} price={price} onClose={vi.fn()} />);
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('거래정지 상태를 표시한다', () => {
    render(<StockDetailModal symbol={sym} price={{ ...price, isTradingHalt: true }} onClose={vi.fn()} />);
    expect(screen.getByText('거래정지')).toBeInTheDocument();
  });

  it('닫기 버튼 클릭 시 onClose가 호출된다', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<StockDetailModal symbol={sym} price={price} onClose={onClose} />);
    // X 버튼 클릭
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[0]); // 첫 번째 버튼이 닫기 버튼
    expect(onClose).toHaveBeenCalled();
  });

  it('하락 종목은 - 부호를 표시한다', () => {
    const downPrice = { ...price, changeDirection: 'down' as const, change: -1000, changePercent: -1.35 };
    const { container } = render(<StockDetailModal symbol={sym} price={downPrice} onClose={vi.fn()} />);
    expect(container.textContent).toContain('-1.35%');
  });
});
