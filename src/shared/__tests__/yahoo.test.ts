import { describe, it, expect } from 'vitest';
import { toYahooTicker, toExtendedQuote } from '../yahoo';
import type { YahooStreamQuote } from '@/shared/types';

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

describe('toExtendedQuote', () => {
  it('하락 (오버나잇 실측: SOXL marketHours=4 → OVERNIGHT)', () => {
    const q: YahooStreamQuote = { price: 193.6, change: -8.08, changePercent: -4.01, marketHours: 4 };
    expect(toExtendedQuote(q)).toEqual({ price: 193.6, change: -8.08, changePercent: -4.01, direction: 'down', session: 'OVERNIGHT' });
  });

  it('상승 (marketHours=0 → PRE)', () => {
    const q: YahooStreamQuote = { price: 205, change: 3.32, changePercent: 1.64, marketHours: 0 };
    expect(toExtendedQuote(q)).toEqual({ price: 205, change: 3.32, changePercent: 1.64, direction: 'up', session: 'PRE' });
  });

  it('변동 0 → flat (marketHours=1 → REGULAR)', () => {
    const q: YahooStreamQuote = { price: 201.68, change: 0, changePercent: 0, marketHours: 1 };
    expect(toExtendedQuote(q)).toEqual({ price: 201.68, change: 0, changePercent: 0, direction: 'flat', session: 'REGULAR' });
  });

  it('가격 없으면 null (네이버 fallback)', () => {
    expect(toExtendedQuote({ price: undefined as unknown as number, change: 0, changePercent: 0, marketHours: 4 })).toBeNull();
    expect(toExtendedQuote(null)).toBeNull();
    expect(toExtendedQuote(undefined)).toBeNull();
  });
});
