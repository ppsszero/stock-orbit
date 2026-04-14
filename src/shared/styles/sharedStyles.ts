import { css } from '@emotion/react';
import { v } from './vars';
import { spacing, fontSize, fontWeight, letterSpacing } from './tokens';

/** 그룹 헤더 (국내주식/해외주식 등) — StockList, StockGrid, StockTile 공유 */
export const groupHeaderStyle = css`
  padding: ${spacing.md}px ${spacing.md}px 6px;
  font-size: ${fontSize.sm}px;
  font-weight: ${fontWeight.bold};
  color: ${v.textTertiary};
  letter-spacing: ${letterSpacing.wide}px;
  position: sticky;
  top: 0;
  background: ${v.bg};
  z-index: 2;
`;

/** 시트 내부 섹션 타이틀 — SettingsSheet, MarqueeSheet 등 공유 */
export const sectionTitleStyle = css`
  font-size: ${fontSize.sm}px;
  font-weight: ${fontWeight.bold};
  color: ${v.textTertiary};
  padding: ${spacing.lg}px ${spacing.xl}px ${spacing.sm}px;
  text-transform: uppercase;
  letter-spacing: ${letterSpacing.wider}px;
  &:not(:first-of-type) { margin-top: ${spacing.xl}px; }
`;
