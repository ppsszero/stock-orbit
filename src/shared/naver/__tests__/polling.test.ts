import { describe, it, expect } from 'vitest';
import { parsePollingData } from '../polling';
import type { NaverPollingData } from '../types';

describe('parsePollingData', () => {
  it('국내 주식(KRX OPEN, 상승 code 2) — 가격/부호/시총 파싱', () => {
    const d: NaverPollingData = {
      itemCode: '005930', stockName: '삼성전자',
      closePriceRaw: '71,200', compareToPreviousClosePriceRaw: '1,200',
      fluctuationsRatioRaw: '1.71', compareToPreviousPrice: { code: '2' },
      marketStatus: 'OPEN', localTradedAt: '2026-06-02T15:30:00',
      stockExchangeType: { nationCode: 'KOR', name: 'KOSPI', nameKor: '유가증권시장' },
      currencyType: { code: 'KRW' },
      marketValueFullRaw: '425000000000000',
      accumulatedTradingVolume: '15,219,364',
    };
    const r = parsePollingData(d, '005930', 'stock');
    expect(r.currentPrice).toBe(71200);
    expect(r.change).toBe(1200);
    expect(r.changePercent).toBeCloseTo(1.71);
    expect(r.changeDirection).toBe('up');
    expect(r.previousClose).toBe(70000);
    expect(r.nation).toBe('KR');
    expect(r.currency).toBe('KRW');
    expect(r.marketStatus).toBe('REGULAR');
    expect(r.marketCapRaw).toBe(425000000000000);
    expect(r.marketCap).toBe('425.0조');
    expect(r.volume).toBe('15,219,364');
  });

  it('하락(code 5)은 change/changePercent를 음수로', () => {
    const d: NaverPollingData = {
      itemCode: '000660', stockName: 'SK하이닉스',
      closePriceRaw: '180,000', compareToPreviousClosePriceRaw: '2,000',
      fluctuationsRatioRaw: '1.10', compareToPreviousPrice: { code: '5' },
      marketStatus: 'OPEN', localTradedAt: '2026-06-02T15:30:00',
      stockExchangeType: { nationCode: 'KOR' },
    };
    const r = parsePollingData(d, '000660', 'stock');
    expect(r.change).toBe(-2000);
    expect(r.changePercent).toBeCloseTo(-1.10);
    expect(r.changeDirection).toBe('down');
  });

  it('NXT/시간외(overMarketStatus OPEN)면 overPrice를 우선 사용', () => {
    const d: NaverPollingData = {
      itemCode: '000660', stockName: 'SK하이닉스',
      closePriceRaw: '180,000', marketStatus: 'CLOSE',
      compareToPreviousPrice: { code: '2' },
      overMarketPriceInfo: {
        overMarketStatus: 'OPEN', overPrice: '182,500',
        compareToPreviousClosePrice: '2,500', fluctuationsRatio: '1.39',
        compareToPreviousPrice: { code: '2' }, localTradedAt: '2026-06-02T17:00:00',
      },
    };
    const r = parsePollingData(d, '000660', 'stock');
    expect(r.currentPrice).toBe(182500);
    expect(r.change).toBe(2500);
    expect(r.changePercent).toBeCloseTo(1.39);
    expect(r.marketStatus).toBe('AFTER');   // over OPEN, tradingSessionType 미지정 → 시간외(AFTER) 기본
    expect(r.updatedAt).toBe('2026-06-02T17:00:00');
  });

  it('NXT 폐장 후(overMarketStatus CLOSE)에도 NXT 마지막가가 KRX 종가보다 최신이면 NXT 우선', () => {
    // 실제 회귀 사례: 20시 이후 KRX(15:30 종가)와 NXT(20:00 종가) 둘 다 닫힘.
    // 과거엔 overMarketStatus!=='OPEN'이라 KRX 종가로 되돌아갔으나, NXT가 더 최신이므로 NXT 우선이어야 함.
    const d: NaverPollingData = {
      itemCode: '000660', stockName: 'SK하이닉스',
      closePriceRaw: '2,360,000', compareToPreviousClosePriceRaw: '3,000',
      fluctuationsRatioRaw: '0.13', compareToPreviousPrice: { code: '5' },
      marketStatus: 'CLOSE', localTradedAt: '2026-06-02T15:30:00+09:00',
      stockExchangeType: { nationCode: 'KOR' },
      overMarketPriceInfo: {
        tradingSessionType: 'AFTER_MARKET', overMarketStatus: 'CLOSE',
        overPrice: '2,324,000', compareToPreviousClosePrice: '39,000',
        fluctuationsRatio: '1.65', compareToPreviousPrice: { code: '5' },
        localTradedAt: '2026-06-02T20:00:00.000000+09:00',
      },
    };
    const r = parsePollingData(d, '000660', 'stock');
    expect(r.currentPrice).toBe(2324000);      // NXT 마지막가 (KRX 2,360,000 아님)
    expect(r.change).toBe(-39000);
    expect(r.changePercent).toBeCloseTo(-1.65);
    expect(r.changeDirection).toBe('down');
    expect(r.marketStatus).toBe('CLOSED');      // 둘 다 닫힘 → CLOSED 유지
  });

  it('NXT 장전(PRE_MARKET, overMarketStatus OPEN)이면 KRX PREOPEN이어도 NXT 가격 우선', () => {
    // 실제 회귀 사례(2026-06-05 08:53): 장전엔 KRX가 PREOPEN이라 localTradedAt가 실시간 틱해서
    // NXT 마지막 체결(08:50)보다 최신처럼 보임 → 타임스탬프 비교만으론 NXT가 무시되던 버그.
    // NXT가 OPEN이면 타임스탬프 무관하게 NXT 우선이어야 함.
    const d: NaverPollingData = {
      itemCode: '000660', stockName: 'SK하이닉스',
      closePriceRaw: '2,298,000', compareToPreviousClosePriceRaw: '0',
      fluctuationsRatioRaw: '0', compareToPreviousPrice: { code: '3' },
      marketStatus: 'PREOPEN', localTradedAt: '2026-06-05T08:53:17.92027+09:00',
      stockExchangeType: { nationCode: 'KOR' },
      overMarketPriceInfo: {
        tradingSessionType: 'PRE_MARKET', overMarketStatus: 'OPEN',
        overPrice: '2,162,000', compareToPreviousClosePrice: '136,000',
        fluctuationsRatio: '5.92', compareToPreviousPrice: { code: '5' },
        localTradedAt: '2026-06-05T08:50:00.000000+09:00',
      },
    };
    const r = parsePollingData(d, '000660', 'stock');
    expect(r.currentPrice).toBe(2162000);   // NXT 장전가 (KRX 2,298,000 아님)
    expect(r.changeDirection).toBe('down');
    expect(r.changePercent).toBeCloseTo(-5.92);
    expect(r.marketStatus).toBe('PRE');      // NXT 장전 OPEN → PRE
  });

  it('지수(index)는 nationCode 누락 시 US로 오분류하지 않고 빈 문자열', () => {
    const d: NaverPollingData = {
      itemCode: 'KOSPI', stockName: '코스피',
      closePriceRaw: '2,650.5', compareToPreviousClosePriceRaw: '10.2',
      fluctuationsRatioRaw: '0.39', compareToPreviousPrice: { code: '2' },
      marketStatus: 'OPEN', localTradedAt: '2026-06-02T15:30:00',
    };
    const r = parsePollingData(d, 'KOSPI', 'index');
    expect(r.nation).toBe('');
    expect(r.market).toBe('지수');
    expect(r.currency).toBe('');
    expect(r.marketCap).toBeUndefined();
    expect(r.isTradingHalt).toBe(false);
  });

  it('보합(code 3, pct 0)은 flat', () => {
    const d: NaverPollingData = {
      itemCode: '005930', stockName: '삼성전자',
      closePriceRaw: '71,000', compareToPreviousClosePriceRaw: '0',
      fluctuationsRatioRaw: '0', compareToPreviousPrice: { code: '3' },
      marketStatus: 'OPEN', localTradedAt: '2026-06-02T15:30:00',
      stockExchangeType: { nationCode: 'KOR' },
    };
    const r = parsePollingData(d, '005930', 'stock');
    expect(r.change).toBe(0);
    expect(r.changeDirection).toBe('flat');
  });
});
