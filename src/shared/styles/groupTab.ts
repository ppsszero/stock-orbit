import { css } from '@emotion/react';
import { Theme } from './theme';
import { v } from './vars';
import { spacing, fontSize, fontWeight, radius, transition } from './tokens';

/**
 * 그룹 탭 공통 스타일 — "2뎁스 탭" 느낌.
 * - 활성 탭만 회색 배경으로 강조
 * - 비활성 탭은 배경 없음 (transparent), 호버 시만 살짝 회색
 *
 * "전체" / "그룹편집" 같은 액션 성격의 특수 탭은 별도 primary 스타일로 표현.
 * (groupTabStyle.tab은 일반 그룹 탭 전용)
 */
export const groupTabStyle = {
  tab: (_t: Theme, active: boolean) => css`
    /* SegmentedControl(우측 currency 토글)과 동일 28px 고정 높이로 정렬 */
    height: 28px; box-sizing: border-box;
    display: inline-flex; align-items: center;
    padding: 0 ${spacing.lg}px; border-radius: ${radius.lg}px;
    font-size: ${fontSize.md}px; cursor: pointer; white-space: nowrap;
    font-weight: ${active ? fontWeight.bold : fontWeight.medium};
    color: ${active ? v.text : v.textSecondary};
    background: ${active ? v.bgSecondary : 'transparent'};
    flex-shrink: 0; transition: all ${transition.fast};
    &:hover { background: ${active ? v.bgTertiary : v.bgSecondary}; }
  `,
  /** "전체" / "그룹편집" 등 액션 성격의 특수 탭 — border outline 강조.
   * 일반 탭(active=회색 bg)과 위계가 비슷해 보이지 않도록 outline으로 차별화.
   * border는 항상 accentBorder (그룹 추가 hover 느낌) — 강조는 배경(accentTint)으로. */
  tabPrimary: (_t: Theme, active: boolean) => css`
    height: 28px; box-sizing: border-box;
    display: inline-flex; align-items: center;
    padding: 0 ${spacing.lg}px; border-radius: ${radius.lg}px;
    font-size: ${fontSize.md}px; cursor: pointer; white-space: nowrap;
    font-weight: ${fontWeight.semibold};
    color: ${v.accent};
    background: ${active ? v.accentTint : 'transparent'};
    border: 1px solid ${v.accentBorder};
    flex-shrink: 0; transition: all ${transition.fast};
    &:hover { background: ${v.accentTint}; }
  `,
  scrollBtn: css`
    width: 22px; height: 26px; border: none; background: ${v.bg};
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: ${v.textTertiary}; flex-shrink: 0;
    border-radius: ${radius.sm}px;
    &:hover { color: ${v.text}; background: ${v.bgSecondary}; }
  `,
} as const;
