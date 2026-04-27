import { css, keyframes } from '@emotion/react';
import { v } from './vars';
import { sem } from './semantic';
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
  margin-bottom: ${spacing.sm}px;
  &:not(:first-of-type) { margin-top: ${spacing.xl}px; }
`;

/** 가격 갱신 배경 하이라이트 — 트레이딩 터미널 표준 패턴 */
const highlightUp = keyframes`
  0% { background: color-mix(in srgb, ${sem.feedback.up} 25%, transparent); }
  100% { background: transparent; }
`;
const highlightDown = keyframes`
  0% { background: color-mix(in srgb, ${sem.feedback.down} 25%, transparent); }
  100% { background: transparent; }
`;
const highlightFlat = keyframes`
  0% { background: color-mix(in srgb, ${sem.feedback.flat} 20%, transparent); }
  100% { background: transparent; }
`;

/** 가격 갱신 flash 스타일 — usePriceFlash 반환값으로 선택 */
export const priceFlash = {
  up: css`border-radius: 2px; padding: 1px 2px; margin: -1px -2px; animation: ${highlightUp} 0.8s ease-out;`,
  down: css`border-radius: 2px; padding: 1px 2px; margin: -1px -2px; animation: ${highlightDown} 0.8s ease-out;`,
  flat: css`border-radius: 2px; padding: 1px 2px; margin: -1px -2px; animation: ${highlightFlat} 0.8s ease-out;`,
} as const;

/**
 * 등락 방향별 텍스트 스타일 팩토리.
 * 마퀴/리스트/그리드/랭킹 등 "등락률 텍스트"가 들어가는 자리에 공통 사용.
 * 차이는 fontSize뿐 — 나머지(weight, tabular-nums, 색상)는 동일.
 */
export const makeDirectionalChange = (size: number) => ({
  up: css`font-size: ${size}px; font-weight: ${fontWeight.semibold}; font-variant-numeric: tabular-nums; color: ${sem.feedback.up};`,
  down: css`font-size: ${size}px; font-weight: ${fontWeight.semibold}; font-variant-numeric: tabular-nums; color: ${sem.feedback.down};`,
  flat: css`font-size: ${size}px; font-weight: ${fontWeight.semibold}; font-variant-numeric: tabular-nums; color: ${sem.feedback.flat};`,
}) as Record<'up' | 'down' | 'flat', ReturnType<typeof css>>;
