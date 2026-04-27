/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { memo } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useStockDnd } from '../hooks/useStockDnd';
import { StockSymbol, StockPrice } from '@/shared/types';
import { useStore } from '@/app/store';
import { groupHeaderStyle } from '@/shared/styles/sharedStyles';
import { useStockGroups, StockGroup } from '../hooks/useStockGroups';
import { StockRow } from './StockRow';
import { EmptyState } from './EmptyState';

export type { StockGroup };

interface Props {
  symbols: StockSymbol[];
  prices: Record<string, StockPrice>;
  currencyMode: 'KRW' | 'USD';
  usdkrw: number;
  customGroups?: StockGroup[];
  onRemove: (code: string) => void;
  onClick: (symbol: StockSymbol) => void;
  onReorder: (activeCode: string, overCode: string) => void;
  onDetail: (symbol: StockSymbol, price: StockPrice) => void;
}

// NOTE: DndContext는 전체를 감싸지만, SortableContext는 그룹별로 분리.
// 이렇게 해야 국내↔해외 그룹 간 드래그가 차단되고, 그룹 내에서만 순서 변경 가능.
// WARNING: SortableContext items 배열은 렌더 순서와 일치해야 함. 불일치 시 드롭 애니메이션 깨짐.
export const StockList = memo(({
  symbols, prices, currencyMode, usdkrw,
  customGroups, onRemove, onClick, onReorder, onDetail,
}: Props) => {
  const sortKey = useStore(s => s.settings.sortKey);
  const sortDir = useStore(s => s.settings.sortDir);
  const { groups } = useStockGroups(symbols, prices, customGroups, { sortByMarketOpen: true, sortKey, sortDir });

  const { sensors, handleDragEnd } = useStockDnd(onReorder);

  if (symbols.length === 0) return <EmptyState />;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div css={s.list} role="list" aria-label="종목 목록">
        {groups.map(group => (
          <div key={group.label}>
            <div css={s.groupHeader}>{group.label}</div>
            <SortableContext items={group.items.map(sym => sym.code)} strategy={verticalListSortingStrategy}>
              {group.items.map(sym => (
                <StockRow
                  key={sym.code}
                  sym={sym}
                  price={prices[sym.code]}
                  currencyMode={currencyMode}
                  usdkrw={usdkrw}
                  onRemove={onRemove}
                  onClick={onClick}
                  onDetail={onDetail}
                />
              ))}
            </SortableContext>
          </div>
        ))}
      </div>
    </DndContext>
  );
});

const s = {
  list: css`flex: 1; overflow-y: auto; overflow-x: hidden;`,
  groupHeader: groupHeaderStyle,
};
