/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { memo } from 'react';
import { FiExternalLink } from 'react-icons/fi';
import { spacing, fontSize, fontWeight, radius, transition } from '@/shared/styles/tokens';
import { sem } from '@/shared/styles/semantic';

interface Props {
  label: string;
  onClick: () => void;
}

export const MoreLink = memo(({ label, onClick }: Props) => (
  <div css={s.wrap}>
    <button css={s.btn} onClick={onClick}>
      <span>{label}</span>
      <FiExternalLink size={13} />
    </button>
  </div>
));

const s = {
  wrap: css`
    padding: ${spacing.xl}px ${spacing.xl}px ${spacing['2xl']}px;
    display: flex; justify-content: center;
  `,
  btn: css`
    display: flex; align-items: center; gap: ${spacing.sm + 1}px;
    padding: ${spacing.md}px ${spacing.xl}px;
    border: 1px solid ${sem.border.default}; border-radius: ${radius['2xl']}px;
    background: transparent; color: ${sem.text.secondary};
    font-size: ${fontSize.base}px; font-weight: ${fontWeight.semibold};
    font-family: inherit; cursor: pointer;
    transition: all ${transition.fast};
    &:hover { background: ${sem.bg.surface}; color: ${sem.text.primary}; }
  `,
};
