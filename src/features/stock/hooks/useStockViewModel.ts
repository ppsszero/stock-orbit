import { useMemo } from 'react';
import { StockSymbol, StockPrice } from '@/shared/types';
import { calcDisplayPrice } from '../utils/currency';
import { fmtNum, dirArrow, dirSign, fmtPercent, NATION_BADGE, getLogoUrlFromSymbol, getDisplayName } from '@/shared/utils/format';

/** 종목 표시에 필요한 모든 파생 데이터 */
export interface StockViewModel {
  // 이름/코드
  displayName: string;
  displayCode: string;
  logoUrl: string;

  // 국가 뱃지
  badge: { bg: string; fg: string };

  // 거래소/시장
  exchange: string;

  // 가격 (통화 변환 적용)
  priceLabel: string;       // '₩75,000' / '$195.50'
  changeLabel: string;      // '▲ ₩1,000 (+1.35%)'
  percentLabel: string;     // '+1.35%'
  arrowLabel: string;       // '▲' / '▼' / ''

  // 등락 방향
  direction: 'up' | 'down' | 'flat';

  // 시장 상태
  isLive: boolean;
  isTradingHalt: boolean;
  statusLabel: string;      // 'LIVE' / 'CLOSE' / '거래정지'

  // 원시값 (특수 계산 필요 시)
  hasPrice: boolean;
}

/**
 * 종목 데이터를 화면 표시용으로 변환하는 ViewModel 훅.
 *
 * StockRow, GridCard, StockTile 등에서 반복되던 파생 계산을 한 곳에 집약.
 * 컴포넌트는 이 훅의 반환값만으로 렌더링하면 됨 — 도메인 로직 접근 불필요.
 */
export const useStockViewModel = (
  sym: StockSymbol,
  price: StockPrice | undefined,
  currencyMode: 'KRW' | 'USD',
  usdkrw: number,
): StockViewModel => {
  return useMemo(() => {
    const p = price;
    const dir = p?.changeDirection || 'flat';
    const display = p ? calcDisplayPrice(p, currencyMode, usdkrw) : null;
    const badge = NATION_BADGE[sym.nation] || { bg: '#8884', fg: '#888' };

    return {
      displayName: p ? getDisplayName(p, sym) : sym.name,
      displayCode: sym.reutersCode || sym.code,
      logoUrl: getLogoUrlFromSymbol(sym) || '',
      badge,
      exchange: p?.exchange || p?.market || sym.market,
      priceLabel: display ? `${display.prefix}${fmtNum(display.price, display.currency)}` : '',
      changeLabel: display
        ? `${dirArrow(dir)} ${fmtNum(display.change, display.currency)} (${fmtPercent(dir, p!.changePercent)})`
        : '',
      percentLabel: p ? fmtPercent(dir, p.changePercent) : '',
      arrowLabel: dirArrow(dir),
      direction: dir,
      isLive: p?.marketStatus === 'OPEN',
      isTradingHalt: p?.isTradingHalt === true,
      statusLabel: p?.isTradingHalt ? '거래정지' : p?.marketStatus === 'OPEN' ? 'LIVE' : 'CLOSE',
      hasPrice: !!p,
    };
  }, [sym, price, currencyMode, usdkrw]);
};
