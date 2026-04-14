/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { memo } from 'react';
import { FiPlus, FiCheck } from 'react-icons/fi';
import { addButtonTokens } from '@/shared/styles/componentTokens';
import { radius, height } from '@/shared/styles/tokens';

interface Props {
  added: boolean;
  onClick: (e: React.MouseEvent) => void;
  ariaLabel?: string;
}

export const AddButton = memo(({ added, onClick, ariaLabel }: Props) => {
  const t = added ? addButtonTokens.added : addButtonTokens.idle;

  return (
    <button css={s.btn(t, added)} onClick={onClick} aria-label={ariaLabel}>
      {added ? <FiCheck size={14} /> : <FiPlus size={14} />}
    </button>
  );
});

type StateTokens = typeof addButtonTokens.idle | typeof addButtonTokens.added;

const s = {
  btn: (t: StateTokens, added: boolean) => css`
    width: ${height.control}px; height: ${height.control}px;
    border: none; border-radius: ${radius.lg}px;
    cursor: ${added ? 'default' : 'pointer'};
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    background: ${t.default.bg}; color: ${t.default.color};
    &:hover { background: ${t.hover.bg}; color: ${t.hover.color}; }
  `,
};
