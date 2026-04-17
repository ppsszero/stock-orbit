/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useState, useCallback, useRef } from 'react';
import { FiCheck, FiUser, FiHash, FiPercent } from 'react-icons/fi';
import { SortKey, SortDir } from '@/shared/types';
import { useOutsideClick } from '@/shared/hooks/useOutsideClick';
import { Tooltip } from '@/shared/ui/Tooltip';
import { spacing, fontSize, fontWeight, radius, height, shadow, zIndex, opacity } from '@/shared/styles/tokens';
import { sem } from '@/shared/styles/semantic';

interface MenuItem {
  key: SortKey;
  dir: SortDir;
  label: string;
}

const MENU_ITEMS: MenuItem[] = [
  { key: 'custom', dir: 'desc', label: '내 순서' },
  // ---
  { key: 'name', dir: 'asc', label: '종목명 ↑' },
  { key: 'name', dir: 'desc', label: '종목명 ↓' },
  // ---
  { key: 'change', dir: 'desc', label: '등락률 ↑' },
  { key: 'change', dir: 'asc', label: '등락률 ↓' },
];

// 구분선 위치 — "내 순서" 뒤, "종목명 ↓" 뒤
const DIVIDER_AFTER = new Set([0, 2]);

const SORT_ICON_MAP: Record<SortKey, JSX.Element> = {
  custom: <FiUser size={13} />,
  name: <FiHash size={13} />,
  change: <FiPercent size={13} />,
};

const tooltipLabel = (key: SortKey, dir: SortDir): string => {
  const item = MENU_ITEMS.find(m => m.key === key && m.dir === dir);
  return item?.label || '정렬';
};

interface Props {
  sortKey: SortKey;
  sortDir: SortDir;
  onChange: (key: SortKey, dir: SortDir) => void;
  disabled?: boolean;
  disabledReason?: string;
}

export const SortButton = ({ sortKey, sortDir, onChange, disabled, disabledReason }: Props) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useOutsideClick(menuRef, open, () => setOpen(false));

  const handleSelect = useCallback((key: SortKey, dir: SortDir) => {
    onChange(key, dir);
    setOpen(false);
  }, [onChange]);

  const isActive = (m: MenuItem) => m.key === sortKey && m.dir === sortDir;

  const tip = disabled ? (disabledReason || '정렬 불가') : tooltipLabel(sortKey, sortDir);

  return (
    <div ref={menuRef} css={s.wrap}>
      <Tooltip content={tip} position="bottom" display="inline-flex">
        <button css={[s.iconBtn, disabled && s.iconBtnDisabled]} onClick={() => !disabled && setOpen(v => !v)} aria-label="정렬 변경">
          {SORT_ICON_MAP[sortKey]}
        </button>
      </Tooltip>

      {open && (
        <div css={s.menu}>
          {MENU_ITEMS.map((m, i) => (
            <div key={`${m.key}-${m.dir}`}>
              <button
                css={[s.item, isActive(m) && s.itemActive]}
                onClick={() => handleSelect(m.key, m.dir)}
              >
                <div css={s.itemLeft}>{SORT_ICON_MAP[m.key]}<span>{m.label}</span></div>
                {isActive(m) && <FiCheck size={12} />}
              </button>
              {DIVIDER_AFTER.has(i) && <div css={s.divider} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const s = {
  wrap: css`position: relative;`,
  iconBtn: css`
    height: ${height.segSm}px; width: ${height.segSm}px; border: 1px solid ${sem.border.default}; background: transparent;
    border-radius: ${radius.lg}px; cursor: pointer; display: flex; align-items: center; justify-content: center;
    color: ${sem.text.tertiary}; flex-shrink: 0;
    &:hover { background: ${sem.bg.surface}; color: ${sem.text.primary}; }
  `,
  iconBtnDisabled: css`
    opacity: ${opacity.disabledWeak}; cursor: default;
    &:hover { background: transparent; color: ${sem.text.tertiary}; }
  `,
  menu: css`
    position: absolute; top: calc(100% + ${spacing.sm}px); right: 0;
    background: ${sem.surface.card}; border: 1px solid ${sem.border.default};
    border-radius: ${radius.xl}px; padding: ${spacing.sm}px;
    box-shadow: ${shadow.lg}; z-index: ${zIndex.dropdown}; min-width: 130px;
  `,
  item: css`
    width: 100%; padding: ${spacing.md}px ${spacing.lg}px; border: none; background: transparent;
    border-radius: ${radius.md}px; font-size: ${fontSize.md}px; font-weight: ${fontWeight.medium}; color: ${sem.text.primary}; cursor: pointer;
    text-align: left; display: flex; align-items: center; justify-content: space-between;
    font-family: inherit;
    &:hover { background: ${sem.bg.elevated}; }
  `,
  itemActive: css`
    color: ${sem.action.primary}; font-weight: ${fontWeight.semibold};
    background: ${sem.action.primarySubtle};
    &:hover { background: ${sem.action.primaryTint}; }
  `,
  itemLeft: css`display: flex; align-items: center; gap: ${spacing.md}px;`,
  divider: css`
    height: 1px; background: ${sem.border.muted}; margin: ${spacing.sm}px 0;
  `,
};
