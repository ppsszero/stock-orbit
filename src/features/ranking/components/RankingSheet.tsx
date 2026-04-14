/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useState, useCallback } from 'react';

import { spacing, fontSize } from '@/shared/styles/tokens';
import { Preset, StockSymbol } from '@/shared/types';
import { getNaverStockUrl } from '@/shared/naver';
import { PresetTabs } from '@/features/preset/components/PresetTabs';
import { useToast } from '@/shared/ui/Toast';
import { SheetLayout, SegmentedControl, WebViewPanel, LoadingCenter } from '@/shared/ui';
import { useRankingData, NATIONS, RANK_TYPES } from '@/features/ranking/hooks/useRankingData';
import { MAX_TOTAL_SYMBOLS } from '@/app/store';
import { RankRow } from '@/features/ranking/components/RankRow';
import { sem } from '@/shared/styles/semantic';

interface Props {
  open: boolean;
  presets: Preset[];
  activeGroupId: string;
  onClose: () => void;
  /** true = 추가 성공, false = 전체 한도(30개) 초과로 거부됨 */
  onAdd: (sym: StockSymbol) => boolean;
  onRemove: (code: string) => void;
  onGroupSelect: (id: string) => void;
  onAddPreset: (name: string) => void;
  onRenamePreset: (id: string, name: string) => void;
  onRemovePreset: (id: string) => void;
}

export const RankingSheet = ({ open, presets, activeGroupId, onClose, onAdd, onRemove, onGroupSelect, onAddPreset, onRenamePreset, onRemovePreset }: Props) => {
  const toast = useToast();
  const { nation, setNation, rankType, setRankType, items, loading, load } = useRankingData(open);
  const [viewUrl, setViewUrl] = useState<string | null>(null);

  const activePreset = presets.find(p => p.id === activeGroupId) || presets[0];
  const existingCodes = activePreset?.symbols.map(s => s.code) || [];

  const handleRefresh = useCallback(async () => {
    const ok = await load();
    if (ok) toast.show('랭킹을 새로 불러왔어요', 'success');
    else toast.show('랭킹을 불러오지 못했어요', 'error');
  }, [load, toast]);

  const handleToggle = (item: typeof items[number]) => {
    const added = existingCodes.includes(item.code);
    if (added) {
      onRemove(item.code);
      toast.show(`${activePreset.name}에서 삭제했어요.`, 'delete');
    } else {
      const ok = onAdd({
        code: item.code, name: item.name,
        market: '', nation: item.nation,
        reutersCode: item.nation !== 'KR' ? item.reutersCode : undefined,
      });
      if (ok) {
        toast.show(`${activePreset.name}에 추가했어요.`);
      } else {
        toast.show(`최대 ${MAX_TOTAL_SYMBOLS}개까지만 저장할 수 있어요`, 'error');
      }
    }
  };

  return (
    <SheetLayout open={open} title="글로벌 실시간 랭킹" onClose={onClose} onRefresh={handleRefresh} refreshing={loading}>
      <PresetTabs presets={presets} activeId={activeGroupId} onSelect={onGroupSelect}
        onAddPreset={onAddPreset} onRename={onRenamePreset} onRemove={onRemovePreset} compact />

      <div css={st.segPad}>
        <SegmentedControl items={NATIONS} value={nation} onChange={setNation} />
      </div>
      <div css={st.segPad}>
        <SegmentedControl items={RANK_TYPES} value={rankType} onChange={setRankType} />
      </div>

      <div css={st.list}>
        {loading && <LoadingCenter />}
        {!loading && items.length === 0 && <div css={st.empty}>데이터가 없습니다</div>}
        {!loading && items.map(item => (
          <RankRow
            key={item.code + item.rank}
            item={item}
            added={existingCodes.includes(item.code)}
            onLink={() => setViewUrl(getNaverStockUrl({ code: item.code, nation: item.nation, reutersCode: item.reutersCode }))}
            onToggle={() => handleToggle(item)}
          />
        ))}
      </div>

      <WebViewPanel url={viewUrl} onClose={() => setViewUrl(null)} />
    </SheetLayout>
  );
};

const st = {
  segPad: css`padding: 0 ${spacing.xl}px ${spacing.md - 2}px; flex-shrink: 0;`,
  list: css`flex: 1; overflow-y: auto;`,
  empty: css`padding: ${spacing['5xl']}px; text-align: center; font-size: ${fontSize.base}px; color: ${sem.text.tertiary};`,
};
