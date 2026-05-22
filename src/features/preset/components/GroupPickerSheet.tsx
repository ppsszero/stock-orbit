/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useState, useEffect } from 'react';
import { FiFolder, FiPlus } from 'react-icons/fi';
import { spacing, fontSize, fontWeight, radius, transition, height } from '@/shared/styles/tokens';
import { BottomSheet, CheckCircle } from '@/shared/ui';
import { sheetActionBtnStyle } from '@/shared/styles/sharedStyles';
import { sem } from '@/shared/styles/semantic';
import { Preset } from '@/shared/types';
import { MAX_TOTAL_SYMBOLS } from '@/app/store';
import { NewGroupModal } from './NewGroupModal';

interface Props {
  open: boolean;
  presets: Preset[];
  /** 현재 활성 그룹 (이동 대상에서 흐리게 표시) */
  excludeId: string;
  onClose: () => void;
  onConfirm: (targetGroupId: string) => void;
  onAddPreset: (name: string) => void;
}

/**
 * 종목을 다른 그룹으로 옮길 때 선택하는 바텀시트.
 * GroupEditSheet과 동일한 행 패턴 — full-row hover (primarySoft) + 토큰 사이즈.
 */
export const GroupPickerSheet = ({ open, presets, excludeId, onClose, onConfirm, onAddPreset }: Props) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [newGroupOpen, setNewGroupOpen] = useState(false);

  useEffect(() => { if (!open) setSelected(null); }, [open]);

  const handleConfirm = () => {
    if (selected) onConfirm(selected);
  };

  const handleAddGroup = (name: string) => {
    onAddPreset(name);
    setNewGroupOpen(false);
    // 다음 tick에 새 그룹이 추가되니 즉시 선택하긴 어려움 — 사용자가 추가 후 직접 선택
  };

  return (
    <>
      <BottomSheet open={open} onClose={onClose}
        header={<BottomSheet.Header>어떤 그룹으로 옮길까요?</BottomSheet.Header>}
        cta={
          <div css={s.ctaRow}>
            <button type="button" css={sheetActionBtnStyle('neutral')} onClick={onClose}>닫기</button>
            <button type="button" css={sheetActionBtnStyle('primary')}
              disabled={!selected} onClick={handleConfirm}>확인</button>
          </div>
        }>
        {/* 새 그룹 추가 행 — GroupEditSheet과 동일 패턴 */}
        <button type="button" css={s.row(false, false)} onClick={() => setNewGroupOpen(true)}>
          <span css={s.addIcon}><FiPlus size={20} /></span>
          <span css={s.name}>새 그룹 추가</span>
        </button>

        {presets.map(g => {
          const isCurrent = g.id === excludeId;
          const isSel = selected === g.id;
          return (
            <button key={g.id} type="button"
              css={s.row(isSel, isCurrent)}
              disabled={isCurrent}
              onClick={() => !isCurrent && setSelected(g.id)}>
              <span css={s.folderIcon}><FiFolder size={20} /></span>
              <span css={s.name}>
                {g.name}
                {isCurrent && <span css={s.currentTag}>현재 그룹</span>}
              </span>
              <span css={s.count}>{g.symbols.length}/{MAX_TOTAL_SYMBOLS}</span>
              <span css={s.checkWrap}><CheckCircle checked={isSel} /></span>
            </button>
          );
        })}
      </BottomSheet>
      <NewGroupModal open={newGroupOpen}
        existingNames={presets.map(g => g.name)}
        onConfirm={handleAddGroup}
        onCancel={() => setNewGroupOpen(false)} />
    </>
  );
};

const s = {
  /* 행: 풀-너비 hover — width를 (body content + 2*xl)로 명시하고 좌측을 -xl만큼 당겨 시트 좌우 끝까지 채움.
   * (button 엘리먼트는 width:auto + negative margin만으로는 안 늘어남) */
  row: (selected: boolean, disabled: boolean) => css`
    display: flex; align-items: center; gap: ${spacing.sm}px;
    width: calc(100% + ${spacing['4xl']}px);
    margin-left: -${spacing.xl}px;
    padding: ${spacing.sm}px ${spacing.xl}px;
    border: none; font-family: inherit;
    background: ${selected ? sem.action.primarySoft : 'transparent'};
    text-align: left;
    transition: background ${transition.fast};
    ${disabled
      ? `opacity: 0.4; cursor: default;`
      : `cursor: pointer; &:hover { background: ${sem.action.primarySoft}; }`}
  `,
  /* "+" 아이콘 — control-sized, primary 색, 배경 없음 */
  addIcon: css`
    display: inline-flex; align-items: center; justify-content: center;
    width: ${height.control}px; height: ${height.control}px;
    color: ${sem.action.primary};
    flex-shrink: 0;
  `,
  /* 폴더 아이콘 — control-sized, tertiary 색 */
  folderIcon: css`
    display: inline-flex; align-items: center; justify-content: center;
    width: ${height.control}px; height: ${height.control}px;
    color: ${sem.text.tertiary};
    flex-shrink: 0;
  `,
  name: css`
    flex: 1; text-align: left;
    font-size: ${fontSize.lg}px; font-weight: ${fontWeight.semibold};
    color: ${sem.text.primary};
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    padding: ${spacing.sm}px ${spacing.sm}px;
  `,
  currentTag: css`
    margin-left: ${spacing.sm}px;
    font-size: ${fontSize.xs}px; font-weight: ${fontWeight.normal};
    color: ${sem.text.tertiary};
  `,
  count: css`
    font-size: ${fontSize.sm}px; color: ${sem.text.tertiary};
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  `,
  /* count("30/30")와 CheckCircle 사이 추가 여백 — row gap만으론 좁아서 보강 */
  checkWrap: css`margin-left: ${spacing.sm}px; display: inline-flex;`,
  ctaRow: css`
    display: flex; gap: ${spacing.sm}px; width: 100%;
  `,
};
