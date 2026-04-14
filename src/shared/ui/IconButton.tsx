/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { iconButtonTokens } from '@/shared/styles/componentTokens';
import { radius, transition } from '@/shared/styles/tokens';

type Variant = 'default' | 'ghost' | 'accent' | 'danger';

interface Props {
  icon: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  variant?: Variant;
  size?: number;
  active?: boolean;
  ariaLabel?: string;
}

export const IconButton = ({
  icon, onClick, variant = 'default', size = 32, active, ariaLabel,
}: Props) => (
  <button css={s.btn(variant, size, active)} onClick={onClick} aria-label={ariaLabel}>
    {icon}
  </button>
);

const s = {
  btn: (v: Variant, sz: number, active?: boolean) => {
    const t = iconButtonTokens[v];
    const state = active && 'active' in t ? t.active : t.default;
    const hover = active && 'active' in t ? t.active : t.hover;

    return css`
      width: ${sz}px; height: ${sz}px;
      border: none; border-radius: ${radius.lg}px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: all ${transition.fast};
      background: ${state.bg}; color: ${state.color};
      &:hover { background: ${hover.bg}; color: ${hover.color}; }
    `;
  },
};
