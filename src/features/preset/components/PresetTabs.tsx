/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { memo, useState, useCallback, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiChevronLeft, FiChevronRight, FiList, FiGrid, FiSquare, FiInfo } from 'react-icons/fi';
import { SegmentedControl, SortButton, Menu } from '@/shared/ui';
import { Preset, SortKey, SortDir } from '@/shared/types';
import { Tooltip } from '@/shared/ui/Tooltip';
import { useHorizontalScroll } from '@/shared/hooks/useHorizontalScroll';
import { useStore } from '@/app/store';
import { useTheme, useTotalUniqueSymbolCount } from '@/app/store/selectors';
import { spacing, fontSize, fontWeight, radius, height, transition, sp, opacity } from '@/shared/styles/tokens';
import { sem } from '@/shared/styles/semantic';
import { groupTabStyle } from '@/shared/styles/groupTab';
import { usePresetActions } from '@/features/preset/hooks/usePresetActions';
import { NewGroupModal } from './NewGroupModal';

export const ALL_TAB_ID = '__all__';

const VIEW_ICONS = { list: FiList, grid: FiGrid, tile: FiSquare };
const VIEW_LABELS = { list: '리스트', grid: '그리드', tile: '타일' };

interface Props {
  presets: Preset[];
  activeId: string;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  onAddPreset: (name: string) => void;

  /** 메인 전용 — "전체" 탭 표시 */
  showAllTab?: boolean;
  /** 메인 전용 — 뷰모드 토글 */
  viewMode?: 'list' | 'grid' | 'tile';
  onViewModeToggle?: () => void;
  /** 메인 전용 — 통화 토글 */
  currencyMode?: 'KRW' | 'USD';
  onCurrencyToggle?: () => void;
  /** 시트용 — 작은 패딩 */
  compact?: boolean;
  /** 푸터 위에 표시할 안내 텍스트 (검색/랭킹 시트에서 그룹 개념 안내) */
  hint?: string;
}

/**
 * 통합 프리셋 탭 바.
 *
 * 메인/검색/랭킹 어디서든 사용 가능.
 * 공통: 그룹 탭 + 스크롤 + 추가 + 우클릭 이름변경/삭제
 * 옵션: "전체" 탭, 뷰모드 토글, 통화 토글
 */
export const PresetTabs = memo(({
  presets, activeId, onSelect, onRename, onRemove, onAddPreset,
  showAllTab = false, viewMode, onViewModeToggle,
  currencyMode, onCurrencyToggle, compact = false, hint,
}: Props) => {
  const t = useTheme();
  const sortKey = useStore(s => s.settings.sortKey);
  const sortDir = useStore(s => s.settings.sortDir);
  const updateSettings = useStore(s => s.updateSettings);
  const handleSortChange = useCallback((key: SortKey, dir: SortDir) => {
    updateSettings({ sortKey: key, sortDir: dir });
  }, [updateSettings]);
  const {
    ctx, renameTarget,
    openCtx, closeCtx, startRename, commitRename, cancelRename, handleRemove, presetsCount,
  } = usePresetActions({ presets, onRename, onRemove });

  const { scrollRef, canScrollL, canScrollR, scroll } = useHorizontalScroll([presets]);

  // 활성 탭이 온전히 보이도록 스크롤
  const scrollActiveIntoView = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const tab = container.querySelector(`[data-tab-id="${activeId}"]`) as HTMLElement | null;
    if (!tab) return;
    requestAnimationFrame(() => {
      tab.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
    });
  }, [activeId, scrollRef]);

  // activeId 변경 시 + 최초 마운트 시 (레이아웃 안정 후 재시도)
  useEffect(() => {
    scrollActiveIntoView();
    // 최초 로딩 시 레이아웃이 늦게 잡히는 경우 대비
    const t = setTimeout(scrollActiveIntoView, 150);
    return () => clearTimeout(t);
  }, [scrollActiveIntoView]);

  // 전체 그룹에서 중복 없는 종목 수 — "전체" 탭 옆에 작은 숫자로 표시
  const totalUniqueCount = useTotalUniqueSymbolCount();

  const [showNewGroup, setShowNewGroup] = useState(false);
  const handleAddGroup = useCallback((name: string) => {
    onAddPreset(name);
    setShowNewGroup(false);
  }, [onAddPreset]);

  const ViewIcon = viewMode ? VIEW_ICONS[viewMode] : null;

  return (
    <div css={compact ? s.barCompact : s.bar}>
      {hint && (
        <Tooltip content={hint} position="top" display="inline-flex">
          <button type="button" css={s.hintBtn} aria-label="안내">
            <FiInfo size={13} />
          </button>
        </Tooltip>
      )}
      {canScrollL && (
        <button css={groupTabStyle.scrollBtn} onClick={() => scroll(-1)} aria-label="탭 좌측 스크롤">
          <FiChevronLeft size={14} />
        </button>
      )}

      <div ref={scrollRef} css={s.tabs} role="tablist">
        {showAllTab && (
          <div css={groupTabStyle.tabPrimary(t, activeId === ALL_TAB_ID)} role="tab" aria-selected={activeId === ALL_TAB_ID} data-tab-id={ALL_TAB_ID} onClick={() => { onSelect(ALL_TAB_ID); scrollActiveIntoView(); }}>
            전체
            {totalUniqueCount > 0 && <span css={s.tabCount}>{totalUniqueCount}</span>}
          </div>
        )}
        {presets.map(p => (
          <div
            key={p.id} css={groupTabStyle.tab(t, p.id === activeId)}
            role="tab" aria-selected={p.id === activeId}
            data-tab-id={p.id}
            onClick={() => { onSelect(p.id); scrollActiveIntoView(); }}
            onContextMenu={e => { e.preventDefault(); openCtx(p.id, e.clientX, e.clientY); }}
          >
            {p.name}
          </div>
        ))}
      </div>

      {canScrollR && (
        <button css={groupTabStyle.scrollBtn} onClick={() => scroll(1)} aria-label="탭 우측 스크롤">
          <FiChevronRight size={14} />
        </button>
      )}

      <div css={s.fixed}>
        <Tooltip content="그룹 추가" position="bottom" display="inline-flex">
          <button css={s.addBtn} onClick={() => setShowNewGroup(true)} aria-label="그룹 추가"><FiPlus size={13} /></button>
        </Tooltip>
        {ViewIcon && onViewModeToggle && (
          <>
            <Tooltip content={VIEW_LABELS[viewMode!]} position="bottom" display="inline-flex">
              <button css={s.viewBtn} onClick={onViewModeToggle}>
                <ViewIcon size={13} />
              </button>
            </Tooltip>
            <SortButton sortKey={sortKey} sortDir={sortDir} onChange={handleSortChange}
              disabled={viewMode === 'tile'} disabledReason="타일뷰는 시가총액 기준" />
          </>
        )}
        {currencyMode && onCurrencyToggle && (
          <Tooltip content="해외주식 통화 표시" position="bottom" display="inline-flex">
            <SegmentedControl
              items={[{ key: 'USD' as const, label: '$' }, { key: 'KRW' as const, label: '₩' }]}
              value={currencyMode}
              onChange={() => onCurrencyToggle()}
            />
          </Tooltip>
        )}
      </div>

      <Menu open={!!ctx}
        anchorPoint={ctx ? { x: ctx.x, y: ctx.y } : { x: 0, y: 0 }}
        onClose={closeCtx}>
        <Menu.Item icon={<FiEdit2 size={13} />} onClick={startRename}>이름 변경</Menu.Item>
        <Menu.Item icon={<FiTrash2 size={13} />} variant="danger"
          disabled={presetsCount <= 1} onClick={handleRemove}>삭제</Menu.Item>
      </Menu>

      <NewGroupModal
        open={showNewGroup}
        existingNames={presets.map(p => p.name)}
        onConfirm={handleAddGroup}
        onCancel={() => setShowNewGroup(false)}
      />
      <NewGroupModal
        open={!!renameTarget}
        mode="rename"
        initialName={renameTarget?.name || ''}
        existingNames={presets.map(p => p.name)}
        onConfirm={commitRename}
        onCancel={cancelRename}
      />
    </div>
  );
});

const s = {
  hintBtn: css`
    border: none; background: transparent; cursor: help;
    color: ${sem.text.tertiary};
    padding: ${spacing.xs}px; margin-right: ${spacing.md}px;
    display: inline-flex; align-items: center;
    flex-shrink: 0;
    -webkit-app-region: no-drag;
    &:hover { color: ${sem.text.secondary}; }
  `,
  bar: css`
    display: flex; align-items: center;
    height: 44px; padding: 0 ${spacing.xl}px;
    /* 메인 화면 전용 — MarqueeTicker와 시각적 간격 보정 (compact 모드엔 적용 X) */
    margin-top: ${spacing.sm}px;
    background: ${sem.bg.base}; flex-shrink: 0; gap: 0;
  `,
  barCompact: css`
    display: flex; align-items: center;
    padding: ${sp('md', 'xs')} ${spacing.xl}px;
    background: ${sem.bg.base}; flex-shrink: 0; gap: 0;
  `,
  tabs: css`
    display: flex; align-items: center; gap: ${spacing.sm}px;
    flex: 1; min-width: 0;
    overflow-x: auto; scroll-behavior: smooth;
    &::-webkit-scrollbar { display: none; }
  `,
  tabCount: css`
    margin-left: 5px;
    font-size: ${fontSize.xs}px; color: ${sem.text.tertiary};
    font-variant-numeric: tabular-nums;
  `,
  fixed: css`
    display: flex; align-items: center; gap: ${spacing.sm}px;
    flex-shrink: 0; margin-left: ${spacing.md}px;
  `,
  viewBtn: css`
    height: ${height.segSm}px; width: ${height.segSm}px; border: 1px solid ${sem.border.default}; background: transparent;
    border-radius: ${radius.lg}px; cursor: pointer; display: flex; align-items: center; justify-content: center;
    color: ${sem.text.tertiary}; flex-shrink: 0;
    &:hover { background: ${sem.bg.surface}; color: ${sem.text.primary}; }
  `,
  addBtn: css`
    height: ${height.segSm}px; padding: 0 ${spacing.md}px; border: 1px dashed ${sem.action.primaryStrong}; background: transparent;
    border-radius: ${radius.lg}px; cursor: pointer; display: flex; align-items: center; justify-content: center;
    color: ${sem.action.primary}; flex-shrink: 0;
    &:hover { background: ${sem.action.primaryTint}; border-style: solid; }
  `,
};
