/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiMenu, FiTrash2, FiCornerUpRight, FiInbox } from 'react-icons/fi';
import { DndContext, closestCenter, MouseSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToYAxis } from '@/shared/utils/dndModifiers';
import { SheetLayout, StockLogo, ListHeader, CheckCircle } from '@/shared/ui';
import { useToast } from '@/shared/ui/Toast';
import { useStore } from '@/app/store';
import { useTheme } from '@/app/store/selectors';
import { Preset, StockSymbol, inferCategory } from '@/shared/types';
import { sem } from '@/shared/styles/semantic';
import { spacing, fontSize, fontWeight, radius, transition, zIndex, height } from '@/shared/styles/tokens';
import { groupTabStyle } from '@/shared/styles/groupTab';
import { sheetActionBtnStyle } from '@/shared/styles/sharedStyles';
import { getLogoUrlFromSymbol, getDisplayName, NATION_BADGE } from '@/shared/utils/format';
import { useSortableStyle } from '@/features/stock/hooks/useSortableStyle';
import { GroupPickerSheet } from './GroupPickerSheet';
import { GroupEditSheet } from './GroupEditSheet';

interface Props {
  open: boolean;
  /** 초기로 편집할 그룹 (시트 안에서 탭으로 다른 그룹 전환 가능) */
  preset: Preset;
  /** 전체 그룹 목록 (탭 + 이동 대상 선택용) */
  presets: Preset[];
  onClose: () => void;
}

/**
 * EditSymbolsSheet — 관심 종목 일괄 편집 풀스크린 시트.
 * - 헤더: ← / 관심 편집
 * - 그룹 가로스크롤 탭 (시트 안에서 그룹 전환)
 * - 본문: 다중선택 + DnD 순서변경
 * - 푸터: 삭제 / 그룹 이동
 *
 * UX 원칙:
 * - 순서 변경(DnD)은 즉시 store 반영
 * - 선택은 로컬 상태 → 액션 버튼 클릭 시에만 store 반영
 * - 시트 닫거나 다른 그룹 탭으로 전환하면 선택 초기화
 */
export const EditSymbolsSheet = ({ open, preset, presets, onClose }: Props) => {
  const removeSymbolsBatch = useStore(s => s.removeSymbolsBatch);
  const moveSymbolsBatch = useStore(s => s.moveSymbolsBatch);
  const reorderSymbolsByCodes = useStore(s => s.reorderSymbolsByCodes);
  const addPreset = useStore(s => s.addPreset);
  const updateSettings = useStore(s => s.updateSettings);
  const sortKey = useStore(s => s.settings.sortKey);
  const toast = useToast();
  const t = useTheme();

  // 시트 안에서 편집 중인 그룹 id — 초기값은 진입 시 preset
  const [editId, setEditId] = useState(preset.id);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [groupEditOpen, setGroupEditOpen] = useState(false);
  // 세션 동안 sortKey가 강제로 'custom'으로 바뀌었는지 — 닫을 때 토스트 한 번
  const sortForcedRef = useRef(false);

  // 시트가 새로 열릴 때 진입 그룹으로 동기화
  useEffect(() => { if (open) { setEditId(preset.id); sortForcedRef.current = false; } }, [open, preset.id]);
  useEffect(() => { if (!open) { setSelected(new Set()); setPickerOpen(false); } }, [open]);
  // 편집 대상 그룹이 바뀌면 선택 초기화
  useEffect(() => { setSelected(new Set()); }, [editId]);

  // 편집 중인 그룹이 GroupEditSheet에서 삭제됐을 때 첫 그룹으로 fallback (stale editId 방지)
  useEffect(() => {
    if (open && editId && !presets.some(p => p.id === editId) && presets[0]) {
      setEditId(presets[0].id);
    }
  }, [presets, editId, open]);

  // 시트 닫힐 때 토스트 — 사용자가 메인으로 복귀하는 시점
  const handleSheetClose = useCallback(() => {
    if (sortForcedRef.current) {
      toast.show('정렬 기준을 "내 순서"로 바꿨어요');
      sortForcedRef.current = false;
    }
    onClose();
  }, [onClose, toast]);

  const editing = presets.find(p => p.id === editId) ?? preset;
  const symbols = editing.symbols;
  const allSelected = symbols.length > 0 && selected.size === symbols.length;

  const toggle = useCallback((code: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected(prev => prev.size === symbols.length ? new Set() : new Set(symbols.map(s => s.code)));
  }, [symbols]);

  // 메인 뷰와 동일한 섹션(국내/해외/지수·선물)으로 분할.
  // 메인 뷰의 useStockGroups는 store flat 배열을 .filter()로 섹션화하므로,
  // 편집 시트도 동일하게 섹션 단위로 보여줘야 "보이는 순서 == 저장되는 순서"가 일관됨.
  const sections = useMemo(() => {
    const domestic: StockSymbol[] = [];
    const overseas: StockSymbol[] = [];
    const indexFutures: StockSymbol[] = [];
    symbols.forEach(sym => {
      const cat = inferCategory(sym);
      if (cat === 'index' || cat === 'futures') indexFutures.push(sym);
      else if (sym.nation === 'KR') domestic.push(sym);
      else overseas.push(sym);
    });
    // itemIds 미리 계산 — SortableContext에 안정 참조 전달 (매 렌더 새 배열 방지)
    return [
      { key: 'domestic', label: '국내주식', items: domestic, itemIds: domestic.map(s => s.code) },
      { key: 'overseas', label: '해외주식', items: overseas, itemIds: overseas.map(s => s.code) },
      { key: 'indexFutures', label: '지수 · 선물', items: indexFutures, itemIds: indexFutures.map(s => s.code) },
    ].filter(g => g.items.length > 0);
  }, [symbols]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  // 섹션 내 재정렬 → 저장. 다른 섹션 종목의 store 내 절대 위치는 그대로 유지.
  // (메인 뷰가 filter로 섹션을 만들기 때문에 섹션 외 종목의 위치는 보존되어도 시각적 순서 변동 없음.)
  // 또한 sortKey가 name/change면 메인 뷰는 store 순서를 무시하고 자동 정렬하므로,
  // 사용자가 수동으로 재정렬한 의도를 보존하려면 sortKey를 'custom'으로 강제 전환.
  const reorderSection = useCallback((sectionItems: StockSymbol[], activeCode: string, overCode: string) => {
    const fromIdx = sectionItems.findIndex(s => s.code === activeCode);
    const toIdx = sectionItems.findIndex(s => s.code === overCode);
    if (fromIdx === -1 || toIdx === -1) return;
    const orderedSection = [...sectionItems];
    const [moved] = orderedSection.splice(fromIdx, 1);
    orderedSection.splice(toIdx, 0, moved);
    const inSection = new Set(sectionItems.map(s => s.code));
    let i = 0;
    const nextFlat = symbols.map(sym => {
      if (inSection.has(sym.code)) return orderedSection[i++];
      return sym;
    });
    reorderSymbolsByCodes(editing.id, nextFlat.map(s => s.code));
    if (sortKey !== 'custom') {
      updateSettings({ sortKey: 'custom' });
      sortForcedRef.current = true;
    }
  }, [symbols, editing.id, reorderSymbolsByCodes, sortKey, updateSettings]);

  const handleDelete = useCallback(() => {
    if (selected.size === 0) return;
    const count = selected.size;
    removeSymbolsBatch(Array.from(selected), editing.id);
    toast.show(`${count}개 종목을 삭제했어요`);
    setSelected(new Set());
  }, [selected, editing.id, removeSymbolsBatch, toast]);

  const handleOpenPicker = useCallback(() => {
    if (selected.size === 0) return;
    setPickerOpen(true);
  }, [selected.size]);
  const closePicker = useCallback(() => setPickerOpen(false), []);
  const closeGroupEdit = useCallback(() => setGroupEditOpen(false), []);

  // 편집 시트 안에서의 그룹 생성은 활성 그룹을 바꾸지 않음 — 사용자는 종목 이동 중이라 메인 뷰가 멋대로 바뀌면 곤란.
  const addPresetNoActivate = useCallback((name: string) => addPreset(name, { activate: false }), [addPreset]);

  const handlePickerConfirm = useCallback((targetGroupId: string) => {
    const target = presets.find(p => p.id === targetGroupId);
    const count = selected.size;
    moveSymbolsBatch(Array.from(selected), targetGroupId, editing.id);
    if (target) toast.show(`${count}개 종목을 ${target.name}으로 이동했어요`);
    setSelected(new Set());
    setPickerOpen(false);
    // 이동 결과를 사용자가 바로 확인하도록 편집 대상 그룹을 타겟으로 전환
    setEditId(targetGroupId);
  }, [selected, editing.id, moveSymbolsBatch, toast, presets]);

  const count = selected.size;

  return (
    <>
      <SheetLayout
        open={open}
        title="관심 편집"
        zIndex={zIndex.sheet}
        onClose={handleSheetClose}
        noNavBorder>
        <div css={s.tabsBar} role="tablist">
          <div css={groupTabStyle.tabPrimary(t, groupEditOpen)}
            role="button"
            onClick={() => setGroupEditOpen(true)}>
            그룹편집
          </div>
          {presets.map(p => (
            <div key={p.id}
              css={groupTabStyle.tab(t, p.id === editId)}
              role="tab"
              aria-selected={p.id === editId}
              onClick={() => setEditId(p.id)}>
              {p.name}
            </div>
          ))}
        </div>

        <ListHeader
          title={
            <button type="button" css={s.selectAllBtn} onClick={toggleAll}
              disabled={symbols.length === 0} aria-pressed={allSelected}>
              <ListHeader.Title size="lg" weight="semibold"
                color={allSelected ? sem.action.primary : sem.text.primary}>
                전체선택
              </ListHeader.Title>
            </button>
          }
          right={<ListHeader.RightText size="md">{symbols.length}개</ListHeader.RightText>}
        />

        <div css={s.body}>
          {symbols.length === 0 ? (
            <div css={s.empty}>
              <div css={s.emptyInner}>
                <FiInbox size={36} color={sem.text.tertiary} />
                <p>그룹에 종목이 없어요</p>
                <p css={s.emptyHint}>다른 그룹에서 옮기거나 종목을 추가하세요</p>
              </div>
            </div>
          ) : (
            sections.map(section => {
              const onSectionDragEnd = (e: DragEndEvent) => {
                const { active, over } = e;
                if (!over || active.id === over.id) return;
                reorderSection(section.items, active.id as string, over.id as string);
              };
              return (
                <div key={section.key} css={s.section}>
                  <ListHeader caps title={<ListHeader.Title size="sm" color={sem.text.tertiary}>{section.label}</ListHeader.Title>} />
                  <DndContext sensors={sensors} collisionDetection={closestCenter}
                    modifiers={[restrictToYAxis]}
                    onDragEnd={onSectionDragEnd}>
                    <SortableContext items={section.itemIds} strategy={verticalListSortingStrategy}>
                      <div css={s.list}>
                        {section.items.map(sym => (
                          <EditRow key={sym.code}
                            sym={sym}
                            selected={selected.has(sym.code)}
                            onToggle={toggle}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              );
            })
          )}
        </div>

        <div css={s.footer}>
          {count === 0 ? (
            <button type="button" css={sheetActionBtnStyle('neutral')} onClick={handleSheetClose}>
              완료
            </button>
          ) : (
            <>
              <button type="button" css={sheetActionBtnStyle('danger')} onClick={handleDelete}>
                <FiTrash2 size={14} />
                <span>{count}개 삭제</span>
              </button>
              <button type="button" css={sheetActionBtnStyle('primary')}
                disabled={presets.length <= 1} onClick={handleOpenPicker}>
                <FiCornerUpRight size={14} />
                <span>{count}개 그룹 이동</span>
              </button>
            </>
          )}
        </div>
      </SheetLayout>

      <GroupPickerSheet
        open={pickerOpen}
        presets={presets}
        excludeId={editing.id}
        onClose={closePicker}
        onConfirm={handlePickerConfirm}
        onAddPreset={addPresetNoActivate}
      />

      <GroupEditSheet
        open={groupEditOpen}
        presets={presets}
        onClose={closeGroupEdit}
      />
    </>
  );
};

/* ── 개별 행 ─────────────────────────────────────── */
interface EditRowProps {
  sym: StockSymbol;
  selected: boolean;
  onToggle: (code: string) => void;
}

// memo — 선택 토글 시 변경되는 행만 리렌더, 동일 선택 상태 행은 스킵
const EditRow = memo(({ sym, selected, onToggle }: EditRowProps) => {
  const { attributes, listeners, setNodeRef, style, isDragging } = useSortableStyle(sym.code);
  const logoUrl = getLogoUrlFromSymbol(sym);
  const displayName = getDisplayName(null, sym);
  const badge = useMemo(() => NATION_BADGE[sym.nation] || NATION_BADGE.US, [sym.nation]);

  return (
    <div ref={setNodeRef} style={style}
      css={[s.row, isDragging && s.rowDragging]}
      {...attributes}
      onClick={() => onToggle(sym.code)}>
      <CheckCircle checked={selected} />
      <StockLogo
        src={logoUrl}
        fallbackChar={displayName.charAt(0)}
        fallbackBg={badge.bg}
        fallbackFg={badge.fg}
        size={32}
      />
      <div css={s.nameWrap}>
        <span css={s.name}>{displayName}</span>
        <span css={s.code}>{sym.code}</span>
      </div>
      <button type="button" css={s.handle} {...listeners}
        onClick={e => e.stopPropagation()}
        aria-label="순서 변경">
        <FiMenu size={16} />
      </button>
    </div>
  );
});
EditRow.displayName = 'EditRow';

/* ── styles ─────────────────────────────────────── */
const s = {
  tabsBar: css`
    display: flex; align-items: center; gap: ${spacing.sm}px;
    padding: ${spacing.lg}px ${spacing.xl}px ${spacing.md}px;
    overflow-x: auto; scroll-behavior: smooth;
    flex-shrink: 0;
    &::-webkit-scrollbar { display: none; }
  `,
  /* "전체선택" 클릭 영역 — ListHeader.Title을 감싸 인터랙티브하게 만듦 */
  selectAllBtn: css`
    display: inline-flex; align-items: center;
    background: transparent; border: none; padding: 0;
    font-family: inherit; cursor: pointer;
    transition: opacity ${transition.fast};
    &:disabled { opacity: 0.5; cursor: default; }
  `,
  body: css`
    flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden;
    padding: 0 0 ${spacing.md}px;
    /* 자식(empty)의 flex:1 동작을 위한 flex 컨테이너 — 빈 상태 수직 센터 정렬에 필요 */
    display: flex; flex-direction: column;
  `,
  empty: css`
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    color: ${sem.text.secondary};
    padding: ${spacing['5xl']}px ${spacing['2xl']}px;
  `,
  emptyInner: css`
    display: flex; flex-direction: column; align-items: center;
    gap: ${spacing.md}px;
    /* Optical centering — SearchSheet과 동일 수치, 푸터/툴바 영향으로 수학적 중심은 시각적으로 아래로 보임 */
    transform: translateY(-36%);
    p { margin: 0; font-size: ${fontSize.lg}px; }
  `,
  emptyHint: css`
    font-size: ${fontSize.md}px !important; color: ${sem.text.tertiary} !important;
  `,
  section: css`
    & + & { margin-top: ${spacing.lg}px; }
  `,
  list: css`display: flex; flex-direction: column;`,
  row: css`
    display: flex; align-items: center; gap: ${spacing.md}px;
    padding: ${spacing.md}px ${spacing.xl}px;
    background: transparent;
    cursor: pointer; user-select: none;
    transition: background ${transition.fast};
    &:hover { background: ${sem.action.primarySoft}; }
  `,
  rowDragging: css`opacity: 0.6; z-index: 10; background: ${sem.bg.elevated};`,
  nameWrap: css`
    flex: 1; min-width: 0;
    display: flex; flex-direction: column; gap: ${spacing.xs}px;
  `,
  name: css`
    font-size: ${fontSize.lg}px; font-weight: ${fontWeight.semibold}; color: ${sem.text.primary};
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  `,
  code: css`font-size: ${fontSize.sm}px; color: ${sem.text.tertiary}; font-variant-numeric: tabular-nums;`,
  handle: css`
    display: inline-flex; align-items: center; justify-content: center;
    width: ${height.control}px; height: ${height.control}px;
    background: transparent; border: none; color: ${sem.text.tertiary};
    cursor: grab; touch-action: none; flex-shrink: 0;
    border-radius: ${radius.md}px;
    transition: background ${transition.fast}, color ${transition.fast};
    &:hover { background: ${sem.bg.elevated}; color: ${sem.text.secondary}; }
    &:active { cursor: grabbing; }
  `,
  footer: css`
    display: flex; gap: ${spacing.sm}px;
    padding: ${spacing.xl}px;
    flex-shrink: 0;
    background: ${sem.bg.base};
  `,
};
