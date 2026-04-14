import { StockPrice } from '@/shared/types';

export interface DisplayPrice {
  price: number;
  change: number;
  currency: string;
  prefix: string;
}

// NOTE: change는 항상 Math.abs() 적용 — 부호는 dirSign/dirArrow에서 처리.
// 이렇게 분리하면 API의 부호 불일치 문제와 표시 로직이 독립적으로 동작.
export const calcDisplayPrice = (
  p: StockPrice,
  currencyMode: 'KRW' | 'USD',
  usdkrw: number,
): DisplayPrice => {
  const isKR = p.currency === 'KRW';
  const showKRW = isKR || currencyMode === 'KRW';
  const rate = (!isKR && currencyMode === 'KRW' && usdkrw > 0) ? usdkrw : 1;

  return {
    price: isKR ? p.currentPrice : (currencyMode === 'KRW' ? p.currentPrice * rate : p.currentPrice),
    change: isKR ? Math.abs(p.change) : (currencyMode === 'KRW' ? Math.abs(p.change) * rate : Math.abs(p.change)),
    currency: showKRW ? 'KRW' : p.currency,
    prefix: showKRW ? '₩' : '$',
  };
};
