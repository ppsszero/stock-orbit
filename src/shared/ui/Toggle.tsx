/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { spacing, radius, height, transition, shadow } from '@/shared/styles/tokens';
import { sem } from '@/shared/styles/semantic';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export const Toggle = ({ checked, onChange, label }: Props) => (
  <label css={s.wrap}>
    <input
      type="checkbox"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
      css={s.input}
      aria-label={label}
    />
    <span css={s.track} />
  </label>
);

const s = {
  wrap: css`
    position: relative;
    display: inline-flex;
    align-items: center;
    width: 44px;
    height: ${height.toggle}px;
    flex-shrink: 0;
  `,
  input: css`
    opacity: 0;
    width: 0;
    height: 0;
    position: absolute;
  `,
  track: css`
    position: absolute;
    inset: 0;
    background: ${sem.bg.elevated};
    border-radius: ${radius['2xl']}px;
    cursor: pointer;
    transition: ${transition.normal};
    &::before {
      content: '';
      position: absolute;
      width: ${spacing['2xl']}px;
      height: ${spacing['2xl']}px;
      left: ${spacing.xs}px;
      top: ${spacing.xs}px;
      background: white;
      border-radius: ${radius.full}px;
      transition: ${transition.normal};
      box-shadow: ${shadow.sm};
    }
    input:checked + & { background: ${sem.action.primary}; }
    input:checked + &::before { transform: translateX(${spacing['2xl']}px); }
  `,
};
