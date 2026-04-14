/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { memo, useState, useCallback } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiChevronLeft, FiChevronRight, FiList, FiGrid, FiSquare } from 'react-icons/fi';
import { SegmentedControl } from '@/shared/ui';
import { Preset } from '@/shared/types';
import { Tooltip } from '@/shared/ui/Tooltip';
import { useHorizontalScroll } from '@/shared/hooks/useHorizontalScroll';
import { useTheme, useTotalUniqueSymbolCount } from '@/app/store/selectors';
import { spacing, fontSize, fontWeight, radius, height, transition, shadow, zIndex, sp } from '@/shared/styles/tokens';
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
  currencyMode, onCurrencyToggle, compact = false,
}: Props) => {
  const t = useTheme();
  const {
    ctx, renameTarget, menuRef,
    openCtx, startRename, commitRename, cancelRename, handleRemove, presetsCount,
  } = usePresetActions({ presets, onRename, onRemove });

  const { scrollRef, canScrollL, canScrollR, scroll } = useHorizontalScroll([presets]);

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
      {canScrollL && (
        <button css={groupTabStyle.scrollBtn} onClick={() => scroll(-1)} aria-label="탭 좌측 스크롤">
          <FiChevronLeft size={14} />
        </button>
      )}

      <div ref={scrollRef} css={s.tabs} role="tablist">
        {showAllTab && (
          <div css={groupTabStyle.tab(t, activeId === ALL_TAB_ID)} role="tab" aria-selected={activeId === ALL_TAB_ID} onClick={() => onSelect(ALL_TAB_ID)}>
            전체
            {totalUniqueCount > 0 && <span css={s.tabCount}>{totalUniqueCount}</span>}
          </div>
        )}
        {presets.map(p => (
          <div
            key={p.id} css={groupTabStyle.tab(t, p.id === activeId)}
            role="tab" aria-selected={p.id === activeId}
            onClick={() => onSelect(p.id)}
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
          <Tooltip content={VIEW_LABELS[viewMode!]} position="bottom" display="inline-flex">
            <button css={s.viewBtn} onClick={onViewModeToggle}>
              <ViewIcon size={13} />
            </button>
          </Tooltip>
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

      {ctx && (
        <div ref={menuRef} css={s.menu} style={{ left: ctx.x, top: ctx.y }}>
          <button css={s.mi} onClick={startRename}>
            <FiEdit2 size={12} /> 이름 변경
          </button>
          <button css={s.miDanger} disabled={presetsCount <= 1} onClick={handleRemove}>
            <FiTrash2 size={12} /> 삭제
          </button>
        </div>
      )}

      <NewGroupModal
        open={showNewGroup}
        onConfirm={handleAddGroup}
        onCancel={() => setShowNewGroup(false)}
      />
      <NewGroupModal
        open={!!renameTarget}
        mode="rename"
        initialName={renameTarget?.name || ''}
        onConfirm={commitRename}
        onCancel={cancelRename}
      />
    </div>
  );
});

const s = {
  bar: css`
    display: flex; align-items: center;
    height: 44px; padding: 0 ${spacing.md}px;
    background: ${sem.bg.base}; flex-shrink: 0; gap: 0;
  `,
  barCompact: css`
    display: flex; align-items: center;
    padding: ${sp('md', 'xs')} ${spacing.xl}px;
    background: ${sem.bg.base}; flex-shrink: 0; gap: 0;
  `,
  tabs: css`
    display: flex; align-items: center; gap: ${spacing.xs}px;
    flex: 1; min-width: 0;
    overflow-x: auto; scroll-behavior: smooth;
    &::-webkit-scrollbar { display: none; }
  `,
  tabCount: css`
    margin-left: 5px;
    font-size: 10px; color: ${sem.text.tertiary};
    font-variant-numeric: tabular-nums;
  `,
  fixed: css`
    display: flex; align-items: center; gap: ${spacing.md}px;
    flex-shrink: 0; margin-left: ${spacing.md}px;
  `,
  viewBtn: css`
    height: ${height.segSm}px; width: ${height.segSm}px; border: 1px solid ${sem.border.default}; background: transparent;
    border-radius: ${radius.lg}px; cursor: pointer; display: flex; align-items: center; justify-content: center;
    color: ${sem.text.tertiary}; flex-shrink: 0;
    &:hover { background: ${sem.bg.surface}; color: ${sem.text.primary}; }
  `,
  addBtn: css`
    height: ${height.segSm}px; padding: 0 ${spacing.md}px; border: 1px dashed ${sem.border.default}; background: transparent;
    border-radius: ${radius.lg}px; cursor: pointer; display: flex; align-items: center; justify-content: center;
    color: ${sem.text.tertiary}; flex-shrink: 0;
    &:hover { background: ${sem.bg.surface}; color: ${sem.text.primary}; border-style: solid; }
  `,
  menu: css`
    position: fixed; background: ${sem.surface.card}; border: 1px solid ${sem.border.default};
    border-radius: ${radius.xl}px; padding: ${spacing.sm}px; box-shadow: ${shadow.lg};
    z-index: ${zIndex.sticky}; min-width: 130px;
  `,
  mi: css`
    width: 100%; padding: ${spacing.md}px ${spacing.lg}px; border: none; background: transparent;
    border-radius: ${radius.md}px; font-size: ${fontSize.md}px; color: ${sem.text.primary}; cursor: pointer;
    text-align: left; display: flex; align-items: center; gap: ${spacing.md}px;
    &:hover { background: ${sem.bg.elevated}; }
  `,
  miDanger: css`
    width: 100%; padding: ${spacing.md}px ${spacing.lg}px; border: none; background: transparent;
    border-radius: ${radius.md}px; font-size: ${fontSize.md}px; color: ${sem.action.danger}; cursor: pointer;
    text-align: left; display: flex; align-items: center; gap: ${spacing.md}px;
    &:hover { background: ${sem.action.dangerTint}; }
    &:disabled { opacity: 0.35; cursor: default; &:hover { background: transparent; } }
  `,
};
