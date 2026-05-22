/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FiSearch, FiX, FiInfo } from 'react-icons/fi';
import { Preset, StockSymbol } from '@/shared/types';
import { spacing, fontSize, fontWeight, radius, zIndex as z } from '@/shared/styles/tokens';
import { useSearchSheet } from '../hooks/useSearchSheet';
import { PresetTabs } from '@/features/preset/components/PresetTabs';
import { SearchResultItem } from './SearchResultItem';
import { SheetLayout, WebViewPanel, LoadingCenter } from '@/shared/ui';
import { useWebViewState } from '@/shared/hooks/useWebViewState';
import { getNaverStockUrl } from '@/shared/naver';
import { mapNationCode } from '@/shared/utils/format';
import { sem } from '@/shared/styles/semantic';
import { MAX_TOTAL_SYMBOLS } from '@/app/store';
import { useTotalUniqueSymbolCount } from '@/app/store/selectors';

interface Props {
  open: boolean; existingCodes: string[]; presetName?: string;
  presets: Preset[]; activeGroupId: string;
  onClose: () => void;
  /** true = 추가 성공, false = 전체 한도(30개) 초과로 거부됨 */
  onAdd: (s: StockSymbol) => boolean;
  onRemove: (code: string) => void;
  onGroupSelect: (id: string) => void; onAddPreset: (name: string) => void;
  onRenamePreset: (id: string, name: string) => void; onRemovePreset: (id: string) => void;
}

export const SearchSheet = ({ open, existingCodes, presetName, presets, activeGroupId, onClose, onAdd, onRemove, onGroupSelect, onAddPreset, onRenamePreset, onRemovePreset }: Props) => {
  const {
    query, results, loading, search, clear,
    inputRef, resultsRef, selectedIdx,
    handleToggle, handleKeyDown,
  } = useSearchSheet({ open, existingCodes, presetName, onClose, onAdd, onRemove });

  // 전체 그룹 통틀어 중복 없는 종목 수 — 안내 메시지에 현재 저장량 표시
  const totalCount = useTotalUniqueSymbolCount();

  const { view, open: openView, close: closeView } = useWebViewState(open);

  return (
    <SheetLayout open={open} title="종목검색" zIndex={z.overlay} onClose={onClose} noNavBorder>
      <div css={s.searchWrap}>
        <div css={s.field}>
          <FiSearch size={15} color={sem.text.tertiary} />
          <input ref={inputRef} css={s.input} placeholder="종목명, 종목코드 검색"
            value={query} onChange={e => search(e.target.value)} onKeyDown={handleKeyDown} />
          {query && <button css={s.clearBtn} onClick={() => { clear(); inputRef.current?.focus(); }}><FiX size={12} /></button>}
        </div>
      </div>
      <div ref={resultsRef} css={s.results} role="listbox">
        {loading && <LoadingCenter fill />}
        {!loading && !query && (
          <div css={s.empty}>
            <div css={s.emptyInner}>
              <FiInfo size={36} color={sem.text.tertiary} />
              <p css={s.emptyTitle}>
                최대 <strong>{MAX_TOTAL_SYMBOLS}개</strong>까지 저장할 수 있어요
              </p>
              <p css={s.emptySub}>
                네이버 증권 API 부하 방지를 위해 제한합니다<br/>현재 <strong>{totalCount}개</strong> 저장됨
              </p>
            </div>
          </div>
        )}
        {!loading && query && results.length === 0 && <div css={s.noRes}>검색 결과가 없습니다</div>}
        {results.map((item, idx) => (
          <SearchResultItem
            key={item.code + (item.reutersCode || '')}
            item={item}
            added={existingCodes.includes(item.code)}
            selected={idx === selectedIdx}
            onToggle={handleToggle}
            onLink={it => openView(getNaverStockUrl({
              code: it.code,
              nation: mapNationCode(it.nationCode),
              reutersCode: it.reutersCode,
            }))}
          />
        ))}
      </div>
      <div css={s.footer}>
        <PresetTabs presets={presets} activeId={activeGroupId} onSelect={onGroupSelect}
          onAddPreset={onAddPreset} onRename={onRenamePreset} onRemove={onRemovePreset} compact
          hint={'선택한 그룹에 종목이 추가돼요\n우클릭으로 이름 변경/삭제 가능'} />
      </div>

      <WebViewPanel url={view?.url ?? null} title="종목 정보" onClose={closeView} />
    </SheetLayout>
  );
};

const s = {
  searchWrap: css`padding:0 ${spacing.lg}px ${spacing.lg}px;flex-shrink:0;`,
  field: css`display:flex;align-items:center;background:${sem.bg.surface};border-radius:${radius['2xl']}px;padding:0 ${spacing.lg + 2}px;height:44px;gap:${spacing.md + 2}px;`,
  input: css`flex:1;border:none;background:transparent;font-size:${fontSize.xl}px;color:${sem.text.primary};outline:none;&::placeholder{color:${sem.text.tertiary};}`,
  clearBtn: css`border:none;background:${sem.bg.elevated};width:22px;height:22px;border-radius:${radius.full}px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:${sem.text.secondary};flex-shrink:0;&:hover{background:${sem.bg.surface};}`,
  results: css`flex:1;overflow-y:auto;display:flex;flex-direction:column;`,
  noRes: css`padding:${spacing['5xl']}px ${spacing['2xl']}px;text-align:center;font-size:${fontSize.base}px;color:${sem.text.tertiary};`,
  empty: css`
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    color: ${sem.text.secondary};
    padding: ${spacing['5xl']}px ${spacing['2xl']}px;
  `,
  emptyInner: css`
    display: flex; flex-direction: column; align-items: center;
    gap: ${spacing.md}px;
    /* Optical centering — 인접 요소(PresetTabs 등) hit-test 침범 없이 시각만 보정 */
    transform: translateY(-36%);
  `,
  emptyTitle: css`
    margin: 0; font-size: ${fontSize.lg}px; color: ${sem.text.secondary};
    text-align: center;
    & strong { color: ${sem.action.primary}; font-weight: ${fontWeight.bold}; }
  `,
  emptySub: css`
    margin: 0; font-size: ${fontSize.md}px; color: ${sem.text.tertiary};
    text-align: center; line-height: 1.5;
    & strong { color: ${sem.text.secondary}; font-weight: ${fontWeight.semibold}; }
  `,
  footer: css`border-top: 1px solid ${sem.border.subtle}; flex-shrink: 0;`,
};
