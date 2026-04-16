/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { spacing, fontSize, fontWeight, radius } from '@/shared/styles/tokens';

interface BadgeProps {
  bg: string;
  fg: string;
  children: React.ReactNode;
}

export const Badge = ({ bg, fg, children }: BadgeProps) => (
  <span css={s.badge(bg, fg)}>{children}</span>
);

interface StatusDotProps {
  color: string;
  label: string;
}

export const StatusDot = ({ color, label }: StatusDotProps) => (
  <span css={s.status(color)}>
    <span css={s.dot(color)} />
    {label}
  </span>
);

const s = {
  badge: (bg: string, fg: string) => css`
    padding: 0 ${spacing.sm}px;
    height: 16px;
    border-radius: ${radius.sm}px;
    font-size: ${fontSize.xs}px;
    font-weight: ${fontWeight.bold};
    /* height와 동일한 line-height → descender 공간까지 포함해 정중앙 배치 */
    line-height: 16px;
    background: ${bg};
    color: ${fg};
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  `,
  status: (color: string) => css`
    font-size: ${fontSize.sm}px;
    font-weight: ${fontWeight.semibold};
    color: ${color};
    display: inline-flex;
    align-items: center;
    gap: ${spacing.xs + 1}px;
  `,
  dot: (color: string) => css`
    width: 4px;
    height: 4px;
    border-radius: ${radius.full}px;
    background: ${color};
  `,
};
