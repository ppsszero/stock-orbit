import { describe, it, expect } from 'vitest';
import { toYahooTicker, getYahooStockUrl, toExtendedQuote, applyYahooExtended, selectYahooTargets, withDaymarketSentinel, DM_SENTINEL, isDaymarketCapable, rememberDaymarketCapable, type ExtendedQuote } from '../yahoo';
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

  it('정규장: US는 야후가 가격·세션 권한 — 가격·등락·세션 야후로 덮음', () => {
    const prices = { AAPL: baseNaver({ marketStatus: 'REGULAR', currentPrice: 200 }) };
    const regular: Record<string, ExtendedQuote> = {
      AAPL: { price: 205, change: 5, changePercent: 2.5, direction: 'up', session: 'REGULAR' },
    };
    const out = applyYahooExtended(prices, regular);
    expect(out.AAPL).toMatchObject({
      currentPrice: 205, change: 5, changePercent: 2.5, changeDirection: 'up', marketStatus: 'REGULAR',
    });
  });

  it('네이버 CLOSED여도 야후 활성 세션이면 야후로 덮음 (개장 전환 시 네이버 지연 보완 — 가격+세션 정합)', () => {
    const prices = { AAPL: baseNaver({ marketStatus: 'CLOSED', currentPrice: 200 }) };
    const regular: Record<string, ExtendedQuote> = {
      AAPL: { price: 205, change: 5, changePercent: 2.5, direction: 'up', session: 'REGULAR' },
    };
    const out = applyYahooExtended(prices, regular);
    expect(out.AAPL).toMatchObject({ currentPrice: 205, changePercent: 2.5, marketStatus: 'REGULAR' });
  });

  it('야후 세션 CLOSED면 네이버가 열려 있어도 스킵(stale 가격 덮어쓰기 방지)', () => {
    const prices = { AAPL: baseNaver({ marketStatus: 'REGULAR', currentPrice: 200 }) };
    const closed: Record<string, ExtendedQuote> = {
      AAPL: { price: 199, change: -1, changePercent: -0.5, direction: 'down', session: 'CLOSED' },
    };
    const out = applyYahooExtended(prices, closed);
    expect(out.AAPL).toBe(prices.AAPL);
    expect(out.AAPL.currentPrice).toBe(200);
  });

  it('값 미변동이어도 활성 세션 응답이면 새 객체 — 매 사이클 flash(= 라이브 갱신 중 신호)', () => {
    // 정규장: 야후 가격이 네이버 base와 동일해도 새 참조 → usePriceFlash 트리거.
    // flash = "값 변동"이 아니라 "최신값을 방금 받음" 신호 (사용자: 내가 최신 정보 받고 있나가 더 중요).
    const base = baseNaver({ marketStatus: 'REGULAR', currentPrice: 200, change: 2, changePercent: 1, changeDirection: 'up' });
    const same: Record<string, ExtendedQuote> = {
      AAPL: { price: 200, change: 2, changePercent: 1, direction: 'up', session: 'REGULAR' },
    };
    const out = applyYahooExtended({ AAPL: base }, same);
    expect(out.AAPL).not.toBe(base);                 // 새 참조 → flash 발생
    expect(out.AAPL).toMatchObject({ currentPrice: 200, change: 2, changePercent: 1, marketStatus: 'REGULAR' });
  });

  it('오버나잇 값 미변동도 새 객체 — 데이마켓 매 사이클 flash', () => {
    const base = baseNaver({ marketStatus: 'OVERNIGHT', currentPrice: 210, change: 10, changePercent: 5, changeDirection: 'up' });
    const same: Record<string, ExtendedQuote> = {
      AAPL: { price: 210, change: 10, changePercent: 5, direction: 'up', session: 'OVERNIGHT' },
    };
    const out = applyYahooExtended({ AAPL: base }, same);
    expect(out.AAPL).not.toBe(base);
  });
});

describe('selectYahooTargets', () => {
  const sym = (code: string, nation: string): StockSymbol =>
    ({ code, name: code, market: 'NASDAQ', nation, reutersCode: `${code}.O` });
  const stocks = [sym('AAPL', 'US'), sym('TSLA', 'US'), sym('NVDA', 'US'), sym('TM', 'JP')];

  it('네이버 base 있는 US 전부 — 세션(정규/오버나잇/장마감) 무관 포함', () => {
    const prices = {
      AAPL: baseNaver({ code: 'AAPL', marketStatus: 'REGULAR' }),    // 정규장 — 가격 차용
      TSLA: baseNaver({ code: 'TSLA', marketStatus: 'OVERNIGHT' }),  // 데이마켓
      NVDA: baseNaver({ code: 'NVDA', marketStatus: 'CLOSED' }),     // 진입 후보
    };
    expect(selectYahooTargets(stocks, prices)).toEqual([
      { code: 'AAPL', reutersCode: 'AAPL.O' },
      { code: 'TSLA', reutersCode: 'TSLA.O' },
      { code: 'NVDA', reutersCode: 'NVDA.O' },
    ]);
  });

  it('US가 아니면 세션 무관 제외 (JP는 야후 심볼매핑 미지원)', () => {
    const prices = {
      AAPL: baseNaver({ code: 'AAPL', marketStatus: 'REGULAR' }),
      TM: baseNaver({ code: 'TM', nation: 'JP', marketStatus: 'OVERNIGHT' }),
    };
    expect(selectYahooTargets(stocks, prices).map(t => t.code)).toEqual(['AAPL']);
  });

  it('네이버 base 없는 US는 제외 (머지 못 하므로 구독 낭비 방지)', () => {
    const prices = { AAPL: baseNaver({ code: 'AAPL', marketStatus: 'REGULAR' }) };   // TSLA/NVDA base 없음
    expect(selectYahooTargets(stocks, prices).map(t => t.code)).toEqual(['AAPL']);
  });

  it('prices 미정/빈 가격이면 빈 배열', () => {
    expect(selectYahooTargets(stocks, undefined)).toEqual([]);
    expect(selectYahooTargets(stocks, {})).toEqual([]);
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
