import { useMemo } from 'react';
import { StockSymbol, StockPrice, SortKey, SortDir, inferCategory } from '@/shared/types';

export interface StockGroup {
  label: string;
  items: StockSymbol[];
}

/**
 * 그룹 내 종목을 정렬하는 비교 함수.
 * 'custom'이면 원본 순서(드래그 순서) 유지.
 */
const buildComparator = (
  prices: Record<string, StockPrice>,
  sortKey: SortKey,
  sortDir: SortDir,
) => {
  if (sortKey === 'custom') return undefined;

  const dir = sortDir === 'asc' ? 1 : -1;

  return (a: StockSymbol, b: StockSymbol): number => {
    const pa = prices[a.code];
    const pb = prices[b.code];

    switch (sortKey) {
      case 'name': {
        const na = (pa?.name || a.name).toLowerCase();
        const nb = (pb?.name || b.name).toLowerCase();
        return na.localeCompare(nb, 'ko') * dir;
      }
      case 'change': {
        const va = pa?.changePercent ?? 0;
        const vb = pb?.changePercent ?? 0;
        return (va - vb) * dir;
      }
      default:
        return 0;
    }
  };
};

/**
 * 종목을 그룹별로 분류하고, 그룹 내에서 정렬하는 hook.
 * customGroups가 있으면 그대로 사용, 없으면 국내/해외 자동 분류.
 *
 * 왜 분리했는가:
 * - StockList, StockGrid, StockTile 3곳에 동일한 그룹핑 로직이 복제되어 있었음
 * - 그룹핑 규칙이 변경되면 3곳을 동시에 수정해야 하는 유지보수 위험 존재
 * - 순수한 데이터 가공 로직이므로 UI 컴포넌트에서 분리하는 것이 SRP에 부합
 */
// NOTE: customGroups가 있으면(= "전체" 탭) 프리셋별 그룹을 그대로 사용,
// 없으면(= 개별 프리셋 탭) 국내/해외 자동 분류.
export const useStockGroups = (
  symbols: StockSymbol[],
  prices: Record<string, StockPrice>,
  customGroups?: StockGroup[],
  options?: { sortByMarketOpen?: boolean; sortKey?: SortKey; sortDir?: SortDir },
): { validSymbols: StockSymbol[]; groups: StockGroup[] } => {
  return useMemo(() => {
    const sortKey = options?.sortKey || 'custom';
    const sortDir = options?.sortDir || 'desc';
    const comparator = buildComparator(prices, sortKey, sortDir);

    /** 그룹 내 items를 정렬한 새 그룹 배열 반환 */
    const sortGroups = (groups: StockGroup[]): StockGroup[] => {
      if (!comparator) return groups;
      return groups.map(g => ({
        ...g,
        items: [...g.items].sort(comparator),
      }));
    };

    if (customGroups) {
      const allItems = customGroups.flatMap(g => g.items).filter(sym => sym?.code && sym?.nation);
      const filtered = customGroups.filter(g => g.items.length > 0);
      return {
        validSymbols: allItems,
        groups: sortGroups(filtered),
      };
    }

    const valid = symbols.filter(sym => sym?.code && sym?.nation);
    // 지수/선물은 별도 그룹으로 분리 (category 없는 과거 심볼도 market 필드로 추론)
    const indexFutures = valid.filter(sym => {
      const cat = inferCategory(sym);
      return cat === 'index' || cat === 'futures';
    });
    const stocks = valid.filter(sym => inferCategory(sym) === 'stock');
    const domestic = stocks.filter(sym => sym.nation === 'KR');
    const overseas = stocks.filter(sym => sym.nation !== 'KR');

    const groups: StockGroup[] = [];

    // NOTE: sortByMarketOpen — 현재 개장 중인 시장을 위로 올림.
    if (options?.sortByMarketOpen) {
      const domesticLive = domestic.some(sym => prices[sym.code]?.marketStatus === 'OPEN');
      const overseasLive = overseas.some(sym => prices[sym.code]?.marketStatus === 'OPEN');
      if (domesticLive || !overseasLive) {
        if (domestic.length > 0) groups.push({ label: '국내주식', items: domestic });
        if (overseas.length > 0) groups.push({ label: '해외주식', items: overseas });
      } else {
        if (overseas.length > 0) groups.push({ label: '해외주식', items: overseas });
        if (domestic.length > 0) groups.push({ label: '국내주식', items: domestic });
      }
    } else {
      if (domestic.length > 0) groups.push({ label: '국내주식', items: domestic });
      if (overseas.length > 0) groups.push({ label: '해외주식', items: overseas });
    }

    // 지수/선물은 항상 하단
    if (indexFutures.length > 0) {
      groups.push({ label: '지수 · 선물', items: indexFutures });
    }

    return { validSymbols: valid, groups: sortGroups(groups) };
  }, [symbols, prices, customGroups, options?.sortByMarketOpen, options?.sortKey, options?.sortDir]);
};
