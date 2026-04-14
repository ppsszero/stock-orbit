import { renderHook } from '@testing-library/react';
import { useStockGroups, StockGroup } from '../hooks/useStockGroups';
import { StockSymbol, StockPrice } from '../../types';

const krSymbol: StockSymbol = {
  code: '005930',
  name: '삼성전자',
  market: 'KOSPI',
  nation: 'KR',
};

const krSymbol2: StockSymbol = {
  code: '000660',
  name: 'SK하이닉스',
  market: 'KOSPI',
  nation: 'KR',
};

const usSymbol: StockSymbol = {
  code: 'AAPL',
  name: 'Apple Inc',
  market: 'NASDAQ',
  nation: 'US',
};

const usSymbol2: StockSymbol = {
  code: 'MSFT',
  name: 'Microsoft',
  market: 'NASDAQ',
  nation: 'US',
};

const makePrice = (code: string, nation: string, status: 'OPEN' | 'CLOSE'): StockPrice => ({
  code,
  name: code,
  nation,
  market: 'TEST',
  currentPrice: 100,
  previousClose: 100,
  change: 0,
  changePercent: 0,
  changeDirection: 'flat',
  currency: nation === 'KR' ? 'KRW' : 'USD',
  marketStatus: status,
  updatedAt: '2024-01-01',
});

describe('useStockGroups', () => {
  it('returns empty groups for empty symbols', () => {
    const { result } = renderHook(() => useStockGroups([], {}));
    expect(result.current.validSymbols).toEqual([]);
    expect(result.current.groups).toEqual([]);
  });

  it('creates one group labeled "국내주식" for only Korean stocks', () => {
    const { result } = renderHook(() =>
      useStockGroups([krSymbol, krSymbol2], {}),
    );
    expect(result.current.groups).toHaveLength(1);
    expect(result.current.groups[0].label).toBe('국내주식');
    expect(result.current.groups[0].items).toHaveLength(2);
    expect(result.current.validSymbols).toHaveLength(2);
  });

  it('creates one group labeled "해외주식" for only US stocks', () => {
    const { result } = renderHook(() =>
      useStockGroups([usSymbol, usSymbol2], {}),
    );
    expect(result.current.groups).toHaveLength(1);
    expect(result.current.groups[0].label).toBe('해외주식');
    expect(result.current.groups[0].items).toHaveLength(2);
  });

  it('creates two groups for mixed Korean and US stocks', () => {
    const { result } = renderHook(() =>
      useStockGroups([krSymbol, usSymbol], {}),
    );
    expect(result.current.groups).toHaveLength(2);
    expect(result.current.groups[0].label).toBe('국내주식');
    expect(result.current.groups[1].label).toBe('해외주식');
  });

  it('filters out invalid symbols (no code or nation)', () => {
    const invalid: StockSymbol = { code: '', name: 'Bad', market: '', nation: '' };
    const { result } = renderHook(() =>
      useStockGroups([krSymbol, invalid], {}),
    );
    expect(result.current.validSymbols).toHaveLength(1);
    expect(result.current.groups).toHaveLength(1);
  });

  describe('customGroups', () => {
    it('uses customGroups directly when provided', () => {
      const custom: StockGroup[] = [
        { label: 'My Group', items: [krSymbol, usSymbol] },
      ];
      const { result } = renderHook(() =>
        useStockGroups([krSymbol2], {}, custom),
      );
      expect(result.current.groups).toHaveLength(1);
      expect(result.current.groups[0].label).toBe('My Group');
      expect(result.current.groups[0].items).toHaveLength(2);
    });

    it('ignores symbols parameter when customGroups provided', () => {
      const custom: StockGroup[] = [
        { label: 'Custom', items: [usSymbol] },
      ];
      const { result } = renderHook(() =>
        useStockGroups([krSymbol, krSymbol2], {}, custom),
      );
      expect(result.current.validSymbols).toHaveLength(1);
      expect(result.current.validSymbols[0].code).toBe('AAPL');
    });

    it('filters out empty customGroups', () => {
      const custom: StockGroup[] = [
        { label: 'Has items', items: [krSymbol] },
        { label: 'Empty', items: [] },
      ];
      const { result } = renderHook(() =>
        useStockGroups([], {}, custom),
      );
      expect(result.current.groups).toHaveLength(1);
      expect(result.current.groups[0].label).toBe('Has items');
    });
  });

  describe('sortByMarketOpen', () => {
    it('puts overseas first when overseas OPEN and domestic CLOSE', () => {
      const prices: Record<string, StockPrice> = {
        '005930': makePrice('005930', 'KR', 'CLOSE'),
        AAPL: makePrice('AAPL', 'US', 'OPEN'),
      };
      const { result } = renderHook(() =>
        useStockGroups([krSymbol, usSymbol], prices, undefined, {
          sortByMarketOpen: true,
        }),
      );
      expect(result.current.groups).toHaveLength(2);
      expect(result.current.groups[0].label).toBe('해외주식');
      expect(result.current.groups[1].label).toBe('국내주식');
    });

    it('keeps domestic first when domestic OPEN', () => {
      const prices: Record<string, StockPrice> = {
        '005930': makePrice('005930', 'KR', 'OPEN'),
        AAPL: makePrice('AAPL', 'US', 'CLOSE'),
      };
      const { result } = renderHook(() =>
        useStockGroups([krSymbol, usSymbol], prices, undefined, {
          sortByMarketOpen: true,
        }),
      );
      expect(result.current.groups[0].label).toBe('국내주식');
      expect(result.current.groups[1].label).toBe('해외주식');
    });

    it('keeps domestic first when both are OPEN', () => {
      const prices: Record<string, StockPrice> = {
        '005930': makePrice('005930', 'KR', 'OPEN'),
        AAPL: makePrice('AAPL', 'US', 'OPEN'),
      };
      const { result } = renderHook(() =>
        useStockGroups([krSymbol, usSymbol], prices, undefined, {
          sortByMarketOpen: true,
        }),
      );
      expect(result.current.groups[0].label).toBe('국내주식');
    });

    it('keeps domestic first when both are CLOSE', () => {
      const prices: Record<string, StockPrice> = {
        '005930': makePrice('005930', 'KR', 'CLOSE'),
        AAPL: makePrice('AAPL', 'US', 'CLOSE'),
      };
      const { result } = renderHook(() =>
        useStockGroups([krSymbol, usSymbol], prices, undefined, {
          sortByMarketOpen: true,
        }),
      );
      expect(result.current.groups[0].label).toBe('국내주식');
    });

    it('default order (no sortByMarketOpen) keeps domestic first', () => {
      const prices: Record<string, StockPrice> = {
        '005930': makePrice('005930', 'KR', 'CLOSE'),
        AAPL: makePrice('AAPL', 'US', 'OPEN'),
      };
      const { result } = renderHook(() =>
        useStockGroups([krSymbol, usSymbol], prices),
      );
      expect(result.current.groups[0].label).toBe('국내주식');
    });
  });
});
