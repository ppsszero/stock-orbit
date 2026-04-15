import { useMemo } from 'react';
import { StockSymbol, StockPrice, inferCategory } from '@/shared/types';

export interface StockGroup {
  label: string;
  items: StockSymbol[];
}

/**
 * 종목을 그룹별로 분류하는 hook.
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
  options?: { sortByMarketOpen?: boolean },
): { validSymbols: StockSymbol[]; groups: StockGroup[] } => {
  return useMemo(() => {
    if (customGroups) {
      const allItems = customGroups.flatMap(g => g.items).filter(sym => sym?.code && sym?.nation);
      return {
        validSymbols: allItems,
        groups: customGroups.filter(g => g.items.length > 0),
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

    return { validSymbols: valid, groups };
  }, [symbols, prices, customGroups, options?.sortByMarketOpen]);
};
