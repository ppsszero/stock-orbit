/** @jsxImportSource @emotion/react */
import { memo, useCallback } from 'react';
import { useStore } from './store';
import { useActivePreset, useActiveGroupId } from './store/selectors';
import { MarqueeItem } from '@/shared/types';
import { QueryErrorBoundary } from '@/shared/ui/QueryErrorBoundary';
import { SearchSheet } from '@/features/search';
import { SettingsSheet } from '@/features/settings';
import { StockDetailSheet, StockDetailModal } from '@/features/stock';
import { InvestorSheet } from '@/features/investor';
import { RankingSheet } from '@/features/ranking';
import { NewsSheet } from '@/features/news';
import { MarqueeSheet } from '@/features/marquee';
import { NewGroupModal } from '@/features/preset';

interface Props {
  marqueeItems: MarqueeItem[];
}

/**
 * 모든 Sheet/Modal을 관리하는 컨테이너.
 *
 * 왜 분리했는가:
 * - App.tsx에 ~10개 Sheet가 나열되어 있어 가독성이 떨어졌음
 * - Sheet 관련 store 접근을 이 컴포넌트 내부로 캡슐화
 * - Sheet가 열리지 않은 상태에서는 내부 렌더링이 최소화됨 (각 Sheet가 open 체크)
 * - App.tsx는 레이아웃 배치만 담당하도록 SRP 적용
 */
export const SheetManager = memo(({ marqueeItems }: Props) => {
  // Store 직접 접근 — prop drilling 제거
  const settings = useStore(s => s.settings);
  const updateSettings = useStore(s => s.updateSettings);
  const presets = useStore(s => s.presets);
  const openSheet = useStore(s => s.openSheet);
  const setSheet = useStore(s => s.setSheet);
  const addPreset = useStore(s => s.addPreset);
  const renamePreset = useStore(s => s.renamePreset);
  const removePreset = useStore(s => s.removePreset);
  const addSymbol = useStore(s => s.addSymbol);
  const removeSymbol = useStore(s => s.removeSymbol);
  const setActiveId = useStore(s => s.setActiveId);
  const detailSymbol = useStore(s => s.detailSymbol);
  const setDetailSymbol = useStore(s => s.setDetailSymbol);
  const infoSymbol = useStore(s => s.infoSymbol);
  const setInfoSymbol = useStore(s => s.setInfoSymbol);
  const highlightCode = useStore(s => s.highlightCode);
  const setHighlightCode = useStore(s => s.setHighlightCode);
  const resetAll = useStore(s => s.resetAll);

  const activePreset = useActivePreset();
  const activeGroupId = useActiveGroupId();

  const closeSheet = useCallback(() => setSheet(null), [setSheet]);
  const closeDetail = useCallback(() => setDetailSymbol(null), [setDetailSymbol]);
  const closeInfo = useCallback(() => setInfoSymbol(null), [setInfoSymbol]);

  const closeMarquee = useCallback(() => {
    setSheet(null);
    setHighlightCode(null);
  }, [setSheet, setHighlightCode]);

  const handleAddPreset = useCallback((name: string) => {
    addPreset(name);
    setSheet(null);
  }, [addPreset, setSheet]);

  return (
    <QueryErrorBoundary>
      <SearchSheet open={openSheet === 'search'}
        existingCodes={activePreset.symbols.map(s => s.code)}
        presetName={activePreset.name}
        presets={presets} activeGroupId={activeGroupId}
        onClose={closeSheet} onAdd={addSymbol} onRemove={removeSymbol}
        onGroupSelect={setActiveId} onAddPreset={addPreset}
        onRenamePreset={renamePreset} onRemovePreset={removePreset} />

      <StockDetailSheet symbol={detailSymbol} onClose={closeDetail} />
      <StockDetailModal symbol={infoSymbol?.sym || null} price={infoSymbol?.price || null}
        onClose={closeInfo} />
      <SettingsSheet open={openSheet === 'settings'} settings={settings}
        onClose={closeSheet} onUpdate={updateSettings}
        onReset={resetAll} />
      <MarqueeSheet open={openSheet === 'marquee'} items={marqueeItems}
        highlightCode={highlightCode}
        onClose={closeMarquee} />
      <InvestorSheet open={openSheet === 'investor'} onClose={closeSheet} marqueeItems={marqueeItems} />
      <RankingSheet open={openSheet === 'ranking'}
        presets={presets} activeGroupId={activeGroupId}
        onClose={closeSheet} onAdd={addSymbol} onRemove={removeSymbol}
        onGroupSelect={setActiveId} onAddPreset={addPreset}
        onRenamePreset={renamePreset} onRemovePreset={removePreset} />
      <NewsSheet open={openSheet === 'news'} onClose={closeSheet} />
      <NewGroupModal open={openSheet === 'newGroup'}
        onConfirm={handleAddPreset}
        onCancel={closeSheet} />
    </QueryErrorBoundary>
  );
});
