/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useCallback, useMemo, useState } from 'react';
import { FiPlus, FiEdit2, FiMenu, FiMinusCircle } from 'react-icons/fi';
import { DndContext, closestCenter, MouseSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToYAxis } from '@/shared/utils/dndModifiers';
import { CSS } from '@dnd-kit/utilities';
import { BottomSheet } from '@/shared/ui';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { useToast } from '@/shared/ui/Toast';
import { useStore } from '@/app/store';
import { Preset } from '@/shared/types';
import { sem } from '@/shared/styles/semantic';
import { spacing, fontSize, fontWeight, radius, transition, height } from '@/shared/styles/tokens';
import { sheetActionBtnStyle } from '@/shared/styles/sharedStyles';
import { NewGroupModal } from './NewGroupModal';

interface Props {
  open: boolean;
  presets: Preset[];
  onClose: () => void;
}

/**
 * GroupEditSheet — 그룹 자체를 편집하는 바텀시트.
 * - + 새 그룹 추가 (NewGroupModal)
 * - 각 그룹 행: 삭제(⊖) / 그룹명+수정(✎) / 드래그 핸들
 * - DnD로 그룹 순서 변경
 *
 * UX: 그룹 1개만 남았을 때 삭제 버튼 비활성 (마지막 그룹 보호).
 * 변경 사항은 즉시 store 반영.
 */
export const GroupEditSheet = ({ open, presets, onClose }: Props) => {
  const addPreset = useStore(s => s.addPreset);
  const removePreset = useStore(s => s.removePreset);
  const renamePreset = useStore(s => s.renamePreset);
  const reorderPresets = useStore(s => s.reorderPresets);
  const toast = useToast();
  const confirm = useConfirm();

  const [newOpen, setNewOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Preset | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = presets.map(p => p.id);
    const fromIdx = ids.indexOf(active.id as string);
    const toIdx = ids.indexOf(over.id as string);
    if (fromIdx === -1 || toIdx === -1) return;
    const next = [...ids];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    reorderPresets(next);
  }, [presets, reorderPresets]);

  const handleAdd = useCallback((name: string) => {
    // 편집 시트 안의 그룹 생성은 활성 그룹 전환 X
    addPreset(name, { activate: false });
    setNewOpen(false);
  }, [addPreset]);

  const handleRemove = useCallback(async (p: Preset) => {
    const ok = await confirm({
      title: `"${p.name}" 삭제`,
      message: '이 그룹을 삭제할까요?\n포함된 종목 목록도 함께 사라져요.',
      confirmText: '삭제할게요', cancelText: '아니요', danger: true,
    });
    if (ok) {
      removePreset(p.id);
      toast.show(`"${p.name}" 그룹을 삭제했어요.`, 'delete');
    }
  }, [confirm, removePreset, toast]);

  const handleCommitRename = useCallback((newName: string) => {
    if (renameTarget) renamePreset(renameTarget.id, newName);
    setRenameTarget(null);
  }, [renameTarget, renamePreset]);

  // 안정 참조 — inline 함수면 매 렌더마다 새 ref → Modal/BottomSheet useBackAction 스택이 reshuffle돼서
  // ESC/back이 잘못된 핸들러를 호출할 수 있음 (e.g. 부모 시트를 닫아버리는 사고).
  const closeNewModal = useCallback(() => setNewOpen(false), []);
  const closeRenameModal = useCallback(() => setRenameTarget(null), []);

  const canRemove = presets.length > 1;
  // SortableContext items에 안정 참조 전달
  const presetIds = useMemo(() => presets.map(p => p.id), [presets]);

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        maxHeightVH={80}
        header={<BottomSheet.Header>그룹 편집</BottomSheet.Header>}
        cta={
          <div css={s.ctaRow}>
            <button type="button" css={sheetActionBtnStyle('primary')} onClick={onClose}>완료</button>
          </div>
        }>
        <div css={s.row}>
          <button type="button" css={s.addIconBtn} onClick={() => setNewOpen(true)}
            aria-label="새 그룹 추가">
            <FiPlus size={20} />
          </button>
          <button type="button" css={s.nameBtn} onClick={() => setNewOpen(true)}>
            <span css={s.name}>새 그룹 추가</span>
          </button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter}
          modifiers={[restrictToYAxis]} onDragEnd={handleDragEnd}>
          <SortableContext items={presetIds} strategy={verticalListSortingStrategy}>
            {presets.map(p => (
              <GroupRow key={p.id}
                preset={p}
                canRemove={canRemove}
                onRemove={() => handleRemove(p)}
                onRename={() => setRenameTarget(p)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </BottomSheet>

      <NewGroupModal
        open={newOpen}
        existingNames={presets.map(p => p.name)}
        onConfirm={handleAdd}
        onCancel={closeNewModal}
      />
      <NewGroupModal
        open={!!renameTarget}
        mode="rename"
        initialName={renameTarget?.name || ''}
        existingNames={presets.map(p => p.name)}
        onConfirm={handleCommitRename}
        onCancel={closeRenameModal}
      />
    </>
  );
};

/* ── Row ─────────────────────────────────────── */
interface RowProps {
  preset: Preset;
  canRemove: boolean;
  onRemove: () => void;
  onRename: () => void;
}

const GroupRow = ({ preset, canRemove, onRemove, onRename }: RowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition: sortTransition, isDragging } = useSortable({ id: preset.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: sortTransition ?? undefined,
  };

  return (
    <div ref={setNodeRef} style={style}
      css={[s.row, isDragging && s.rowDragging]}
      {...attributes}>
      <button type="button" css={s.deleteBtn(canRemove)}
        disabled={!canRemove} onClick={onRemove}
        aria-label="그룹 삭제">
        <FiMinusCircle size={20} />
      </button>
      <button type="button" css={s.nameBtn} onClick={onRename}>
        <span css={s.name}>{preset.name}</span>
        <FiEdit2 size={12} css={s.editIcon} />
      </button>
      <button type="button" css={s.handle} {...listeners}
        aria-label="순서 변경">
        <FiMenu size={16} />
      </button>
    </div>
  );
};

/* ── Styles ─────────────────────────────────────── */
const s = {
  /* "새 그룹 추가" 행 — 다른 그룹 행과 동일 레이아웃, 아이콘만 + (primary) 색 다름. */
  addIconBtn: css`
    display: inline-flex; align-items: center; justify-content: center;
    width: ${height.control}px; height: ${height.control}px;
    background: transparent; border: none;
    color: ${sem.action.primary};
    cursor: pointer;
    flex-shrink: 0;
  `,
  row: css`
    display: flex; align-items: center; gap: ${spacing.sm}px;
    width: calc(100% + ${spacing['4xl']}px);
    margin-left: -${spacing.xl}px;
    padding: ${spacing.sm}px ${spacing.xl}px;
    background: transparent;
    user-select: none;
    transition: background ${transition.fast};
    /* 행 전체가 한 단위로 인식되도록 풀사이즈 hover. 내부 버튼들의 별도 hover bg는 제거. */
    &:hover { background: ${sem.action.primarySoft}; }
  `,
  rowDragging: css`opacity: 0.6; z-index: 10; background: ${sem.bg.elevated}; border-radius: ${radius.lg}px;`,
  deleteBtn: (enabled: boolean) => css`
    display: inline-flex; align-items: center; justify-content: center;
    width: ${height.control}px; height: ${height.control}px;
    background: transparent; border: none;
    color: ${enabled ? sem.action.danger : sem.text.tertiary};
    cursor: ${enabled ? 'pointer' : 'default'};
    flex-shrink: 0;
    transition: opacity ${transition.fast};
    &:disabled { opacity: 0.3; }
  `,
  /* 행 자체가 hover bg를 가져가므로 nameBtn은 별도 hover 효과 없음. */
  nameBtn: css`
    display: inline-flex; align-items: center; gap: ${spacing.md}px;
    max-width: 100%; min-width: 0;
    padding: ${spacing.sm}px ${spacing.sm}px;
    background: transparent; border: none;
    text-align: left; font-family: inherit;
    cursor: pointer;
  `,
  name: css`
    font-size: ${fontSize.lg}px; font-weight: ${fontWeight.semibold};
    color: ${sem.text.primary};
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  `,
  editIcon: css`color: ${sem.text.tertiary}; flex-shrink: 0; transition: color ${transition.fast};`,
  /* handle을 우측 끝으로 밀어내는 자동 마진 — nameBtn은 content-sized 유지 */
  handle: css`
    display: inline-flex; align-items: center; justify-content: center;
    width: ${height.control}px; height: ${height.control}px;
    margin-left: auto;
    background: transparent; border: none; color: ${sem.text.tertiary};
    cursor: grab; touch-action: none; flex-shrink: 0;
    transition: color ${transition.fast};
    &:active { cursor: grabbing; }
  `,
  /* CTA 단일 버튼이라도 sheetActionBtnStyle(flex:1)이 동작하도록 flex 래퍼 */
  ctaRow: css`display: flex; width: 100%;`,
};
