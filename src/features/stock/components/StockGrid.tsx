/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { memo } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { useStockDnd } from '../hooks/useStockDnd';
import { StockSymbol, StockPrice } from '@/shared/types';
import { useStore } from '@/app/store';
import { spacing } from '@/shared/styles/tokens';
import { groupHeaderStyle } from '@/shared/styles/sharedStyles';
import { useStockGroups, StockGroup } from '../hooks/useStockGroups';
import { GridCard } from './GridCard';
import { EmptyState } from './EmptyState';

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

export const StockGrid = memo(({
  symbols, prices, currencyMode, usdkrw,
  customGroups, onRemove, onClick, onReorder, onDetail,
}: Props) => {
  const sortKey = useStore(s => s.settings.sortKey);
  const sortDir = useStore(s => s.settings.sortDir);
  const { groups } = useStockGroups(symbols, prices, customGroups, { sortKey, sortDir });

  const { sensors, handleDragEnd } = useStockDnd(onReorder);

  if (symbols.length === 0) return <EmptyState />;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div css={s.wrap} role="list" aria-label="종목 그리드">
        {groups.map(group => (
          <div key={group.label}>
            <div css={s.groupHeader}>{group.label}</div>
            <SortableContext items={group.items.map(sym => sym.code)} strategy={rectSortingStrategy}>
              <div css={s.grid}>
                {group.items.map(sym => (
                  <GridCard
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
              </div>
            </SortableContext>
          </div>
        ))}
      </div>
    </DndContext>
  );
});

const s = {
  wrap: css`flex: 1; overflow-y: auto; overflow-x: hidden;`,
  groupHeader: groupHeaderStyle,
  grid: css`
    display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: ${spacing.md}px;
    padding: 0 ${spacing.md}px ${spacing.md}px;
  `,
};
