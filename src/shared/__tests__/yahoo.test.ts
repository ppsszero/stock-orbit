import { describe, it, expect } from 'vitest';
import { toYahooTicker, getYahooStockUrl, toExtendedQuote, applyYahooExtended, selectDaymarketTargets, withDaymarketSentinel, DM_SENTINEL, isDaymarketCapable, rememberDaymarketCapable, type ExtendedQuote } from '../yahoo';
import type { YahooStreamQuote, StockPrice, StockSymbol } from '@/shared/types';

const baseNaver = (over: Partial<StockPrice> = {}): StockPrice => ({
  code: 'AAPL', name: '애플', nation: 'US', market: 'NASDAQ',
  currentPrice: 200, previousClose: 200, change: 0, changePercent: 0,
  changeDirection: 'flat', currency: 'USD', marketStatus: 'CLOSED',
  updatedAt: '2026-06-11T00:00:00Z', volume: '1,000', marketCap: '3조',
  ...over,
});

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

describe('getYahooStockUrl', () => {
  it('reutersCode 우선으로 야후 quote URL 생성', () => {
    expect(getYahooStockUrl({ code: 'NVDA.O', reutersCode: 'NVDA.O' })).toBe('https://finance.yahoo.com/quote/NVDA');
    expect(getYahooStockUrl({ code: 'SQLT.K', reutersCode: 'SQLT.K' })).toBe('https://finance.yahoo.com/quote/SQLT');
  });
  it('reutersCode 없으면 code로 폴백', () => {
    expect(getYahooStockUrl({ code: 'TQQQ' })).toBe('https://finance.yahoo.com/quote/TQQQ');
  });
  it('티커 변환 실패(빈 값)는 null — 호출부가 네이버 폴백', () => {
    expect(getYahooStockUrl({ code: '' })).toBeNull();
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

describe('applyYahooExtended', () => {
  const ext: Record<string, ExtendedQuote> = {
    AAPL: { price: 210, change: 10, changePercent: 5, direction: 'up', session: 'OVERNIGHT' },
  };

  it('가격/등락/방향/세션만 야후로 덮고 나머지(거래량·시총)는 네이버 유지', () => {
    const prices = { AAPL: baseNaver() };
    const out = applyYahooExtended(prices, ext);
    expect(out.AAPL).toMatchObject({
      currentPrice: 210, change: 10, changePercent: 5,
      changeDirection: 'up', marketStatus: 'OVERNIGHT',
      volume: '1,000', marketCap: '3조', previousClose: 200,   // 네이버 base 유지
    });
  });

  it('교체된 종목만 새 객체 — 나머지는 참조 유지 (해당 타일만 flash)', () => {
    const aapl = baseNaver();
    const tsla = baseNaver({ code: 'TSLA' });
    const out = applyYahooExtended({ AAPL: aapl, TSLA: tsla }, ext);
    expect(out.AAPL).not.toBe(aapl);   // 머지됨 → 새 참조 → flash
    expect(out.TSLA).toBe(tsla);       // 미머지 → 참조 유지 → flash 없음
  });

  it('네이버 base 없는 종목은 머지 안 함', () => {
    const out = applyYahooExtended({}, ext);
    expect(out.AAPL).toBeUndefined();
  });

  it('원본 불변 (새 컨테이너 반환)', () => {
    const prices = { AAPL: baseNaver() };
    const out = applyYahooExtended(prices, ext);
    expect(out).not.toBe(prices);
    expect(prices.AAPL.currentPrice).toBe(200);   // 원본 그대로
  });
});

describe('selectDaymarketTargets', () => {
  const sym = (code: string, nation: string): StockSymbol =>
    ({ code, name: code, market: 'NASDAQ', nation, reutersCode: `${code}.O` });
  const stocks = [sym('AAPL', 'US'), sym('TSLA', 'US'), sym('NVDA', 'US'), sym('TM', 'JP')];

  it('US의 OVERNIGHT(유지)+CLOSED(진입) 포함 — PRE 등은 제외', () => {
    const prices = {
      AAPL: baseNaver({ code: 'AAPL', marketStatus: 'OVERNIGHT' }),  // 유지
      TSLA: baseNaver({ code: 'TSLA', marketStatus: 'CLOSED' }),     // 진입 — 포함
      NVDA: baseNaver({ code: 'NVDA', marketStatus: 'PRE' }),        // 핸드오프 후 → 제외
    };
    expect(selectDaymarketTargets(stocks, prices)).toEqual([
      { code: 'AAPL', reutersCode: 'AAPL.O' },
      { code: 'TSLA', reutersCode: 'TSLA.O' },
    ]);
  });

  it('hasExtendedHours와 무관하게 CLOSED US는 포함 — 회귀 방지(네이버가 세션 도중 over 정보를 거둬가도 야후 차용 유지)', () => {
    const prices = {
      AAPL: baseNaver({ code: 'AAPL', marketStatus: 'CLOSED', hasExtendedHours: true }),
      TSLA: baseNaver({ code: 'TSLA', marketStatus: 'CLOSED' }),                            // 미설정이어도 포함
      NVDA: baseNaver({ code: 'NVDA', marketStatus: 'CLOSED', hasExtendedHours: false }),   // false여도 포함
    };
    expect(selectDaymarketTargets(stocks, prices).map(t => t.code)).toEqual(['AAPL', 'TSLA', 'NVDA']);
  });

  it('US가 아니면 CLOSED/OVERNIGHT여도 제외', () => {
    const prices = { TM: baseNaver({ code: 'TM', nation: 'JP', marketStatus: 'OVERNIGHT' }) };
    expect(selectDaymarketTargets(stocks, prices)).toEqual([]);
  });

  it('REGULAR/AFTER는 제외 (네이버가 제공하는 세션)', () => {
    const prices = {
      AAPL: baseNaver({ code: 'AAPL', marketStatus: 'REGULAR' }),
      TSLA: baseNaver({ code: 'TSLA', marketStatus: 'AFTER' }),
    };
    expect(selectDaymarketTargets(stocks, prices)).toEqual([]);
  });

  it('prices 미정/빈 가격이면 빈 배열', () => {
    expect(selectDaymarketTargets(stocks, undefined)).toEqual([]);
    expect(selectDaymarketTargets(stocks, {})).toEqual([]);
  });
});

describe('withDaymarketSentinel', () => {
  it('센티널(QQQ) 추가 — 세션 감지용', () => {
    const targets = [{ code: 'AAPL', reutersCode: 'AAPL.O' }];
    expect(withDaymarketSentinel(targets)).toEqual([...targets, DM_SENTINEL]);
  });

  it('사용자가 이미 QQQ 추적 중이면 추가 안 함(충돌 방지 — 사용자 QQQ가 센티널 역할)', () => {
    const targets = [{ code: 'QQQ', reutersCode: 'QQQ.O' }];
    expect(withDaymarketSentinel(targets)).toBe(targets);   // 원본 그대로
  });

  it('센티널 결과는 applyYahooExtended에서 머지되지 않음(가격맵에 없는 코드)', () => {
    const ext: Record<string, ExtendedQuote> = {
      [DM_SENTINEL.code]: { price: 500, change: 1, changePercent: 0.2, direction: 'up', session: 'OVERNIGHT' },
    };
    const out = applyYahooExtended({ AAPL: baseNaver() }, ext);
    expect(out[DM_SENTINEL.code]).toBeUndefined();
    expect(out.AAPL.currentPrice).toBe(200);   // 무영향
  });
});

describe('데이마켓 가능 종목 학습 (isDaymarketCapable / rememberDaymarketCapable)', () => {
  it('학습 전 false → 학습 후 true, 미학습 종목(SQLT)은 계속 false', () => {
    expect(isDaymarketCapable('TSLA')).toBe(false);
    rememberDaymarketCapable(['TSLA']);
    expect(isDaymarketCapable('TSLA')).toBe(true);
    expect(isDaymarketCapable('SQLT')).toBe(false);   // 오버나잇 데이터 받은 적 없음 → 펄스 대상 아님
  });

  it('localStorage에 영속 (orbit-daymarket-codes)', () => {
    rememberDaymarketCapable(['NVDA']);
    const stored = JSON.parse(localStorage.getItem('orbit-daymarket-codes') || '[]') as string[];
    expect(stored).toContain('NVDA');
  });
});
