/** @jsxImportSource @emotion/react */
import { memo, useCallback } from 'react';
import { useStore } from './store';
import { useDisplaySymbols, useGroupedSymbols } from './store/selectors';
import { useDataPolling } from '@/features/stock/hooks/useDataPolling';
import { StockSymbol, StockPrice } from '@/shared/types';
import { StockList, StockGrid, StockTile } from '@/features/stock';
import { QueryErrorBoundary } from '@/shared/ui/QueryErrorBoundary';

// NOTE: Smart Parent / Dumb Children 패턴의 핵심.
// 이 컴포넌트가 스토어·React Query와 통신하고, 자식(List/Grid/Tile)은 props만 받는 순수 컴포넌트.
// onClick → setDetailSymbol: 네이버 웹뷰 시트 열기
// onDetail → setInfoSymbol: 앱 내 상세 모달 열기 (두 가지 상세보기가 별도로 존재)
export const StockViewSwitch = memo(() => {
  const settings = useStore(s => s.settings);
  const displaySymbols = useDisplaySymbols();
  const allGroups = useGroupedSymbols();
  const removeSymbol = useStore(s => s.removeSymbol);
  const reorderByCode = useStore(s => s.reorderByCode);
  const setDetailSymbol = useStore(s => s.setDetailSymbol);
  const setInfoSymbol = useStore(s => s.setInfoSymbol);

  // React Query 캐시 공유 — App.tsx와 동일한 displaySymbols + interval을 사용하므로
  // 같은 queryKey가 되어 API 중복 호출 없이 캐시에서 읽기만 함.
  // WARNING: displaySymbols 셀렉터를 변경하면 App.tsx와 반드시 동기화할 것.
  const { prices, marqueeItems } = useDataPolling(displaySymbols, settings.refreshIntervalDomestic, settings.refreshIntervalOverseas);
  const usdkrw = marqueeItems.find(i => i.code === 'FX_USDKRW')?.currentValue || 0;

  const handleDetail = useCallback((sym: StockSymbol, price: StockPrice) => {
    setInfoSymbol({ sym, price });
  }, [setInfoSymbol]);

  const commonProps = {
    symbols: displaySymbols,
    prices,
    currencyMode: settings.currencyMode,
    usdkrw,
    customGroups: allGroups,
    onRemove: removeSymbol,
    onClick: setDetailSymbol,
    onDetail: handleDetail,
  };

  const view = (() => {
    switch (settings.viewMode) {
      case 'list':
        return <StockList {...commonProps} onReorder={reorderByCode} />;
      case 'grid':
        return <StockGrid {...commonProps} onReorder={reorderByCode} />;
      case 'tile':
        return <StockTile {...commonProps} />;
    }
  })();

  return <QueryErrorBoundary>{view}</QueryErrorBoundary>;
});
