/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { memo } from 'react';
import { StockSymbol, StockPrice } from '@/shared/types';
import { useStore } from '@/app/store';
import { ListHeader } from '@/shared/ui';
import { sem } from '@/shared/styles/semantic';
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
  onDetail: (symbol: StockSymbol, price: StockPrice) => void;
}

// 메인 리스트뷰는 보기 전용 — 순서 변경은 편집 시트에서만 가능.
export const StockList = memo(({
  symbols, prices, currencyMode, usdkrw,
  customGroups, onRemove, onClick, onDetail,
}: Props) => {
  const sortKey = useStore(s => s.settings.sortKey);
  const sortDir = useStore(s => s.settings.sortDir);
  const { groups } = useStockGroups(symbols, prices, customGroups, { sortByMarketOpen: true, sortKey, sortDir });

  if (symbols.length === 0) return <EmptyState />;

  return (
    <div css={s.list} role="list" aria-label="종목 목록">
      {groups.map(group => (
        <div key={group.label}>
          <ListHeader sticky caps title={<ListHeader.Title size="sm" color={sem.text.tertiary}>{group.label}</ListHeader.Title>} />
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
        </div>
      ))}
    </div>
  );
});

const s = {
  list: css`flex: 1; overflow-y: auto; overflow-x: hidden;`,
};
