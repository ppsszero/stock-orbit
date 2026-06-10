import { describe, it, expect } from 'vitest';
import { toYahooTicker, pickExtended } from '../yahoo';
import type { YahooRawQuote } from '@/shared/types';

describe('toYahooTicker', () => {
  it('네이버 reutersCode의 . 앞부분을 야후 티커로', () => {
    expect(toYahooTicker('SOXL.K')).toBe('SOXL');
    expect(toYahooTicker('AAPL.O')).toBe('AAPL');
    expect(toYahooTicker('NVDA.O')).toBe('NVDA');
  });
  it('점 없으면 그대로', () => {
    expect(toYahooTicker('TQQQ')).toBe('TQQQ');
  });
  it('빈 값은 빈 문자열', () => {
    expect(toYahooTicker('')).toBe('');
  });
});

describe('pickExtended', () => {
  const base: YahooRawQuote = { symbol: 'SOXL' };

  it('PRE → preMarketPrice/Change', () => {
    const r = pickExtended({ ...base, marketState: 'PRE', preMarketPrice: 205, preMarketChange: 3.32, preMarketChangePercent: 1.64 });
    expect(r).toEqual({ price: 205, change: 3.32, changePercent: 1.64, direction: 'up' });
  });

  it('POST → postMarketPrice/Change (하락)', () => {
    const r = pickExtended({ ...base, marketState: 'POST', postMarketPrice: 198.81, postMarketChange: -2.87, postMarketChangePercent: -1.42 });
    expect(r).toEqual({ price: 198.81, change: -2.87, changePercent: -1.42, direction: 'down' });
  });

  it('PREPRE(장후 마감~다음 장전 전) → 마지막 postMarket 유지', () => {
    const r = pickExtended({ ...base, marketState: 'PREPRE', postMarketPrice: 198.81, postMarketChange: -2.87, postMarketChangePercent: -1.42 });
    expect(r?.price).toBe(198.81);
    expect(r?.direction).toBe('down');
  });

  it('REGULAR → regularMarketPrice/Change', () => {
    const r = pickExtended({ ...base, marketState: 'REGULAR', regularMarketPrice: 201.68, regularMarketChange: 0, regularMarketChangePercent: 0 });
    expect(r).toEqual({ price: 201.68, change: 0, changePercent: 0, direction: 'flat' });
  });

  it('CLOSED → null (네이버 fallback)', () => {
    expect(pickExtended({ ...base, marketState: 'CLOSED', postMarketPrice: 198 })).toBeNull();
  });

  it('해당 세션 가격이 없으면 null', () => {
    expect(pickExtended({ ...base, marketState: 'PRE' /* preMarketPrice 없음 */ })).toBeNull();
  });
});
