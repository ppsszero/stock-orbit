import { css } from '@emotion/react';
import { Theme } from './theme';
import { v } from './vars';
import { spacing, fontSize, fontWeight, radius, transition } from './tokens';

/**
 * 그룹 탭 공통 스타일.
 * PresetTabs, GroupSelector 양쪽에서 공유.
 */
export const groupTabStyle = {
  tab: (t: Theme, active: boolean) => css`
    /* SegmentedControl(우측 currency 토글)과 동일 28px 고정 높이로 정렬 */
    height: 28px; box-sizing: border-box;
    display: inline-flex; align-items: center;
    padding: 0 ${spacing.lg}px; border-radius: ${radius.lg}px;
    font-size: ${fontSize.md}px; cursor: pointer; white-space: nowrap;
    font-weight: ${active ? fontWeight.bold : fontWeight.medium};
    color: ${active ? v.accent : v.textSecondary};
    /* 비활성 탭에도 옅은 배경을 깔아 그룹 덩어리감을 살림 */
    background: ${active ? t.accent + '14' : v.bgSecondary};
    flex-shrink: 0; transition: all ${transition.fast};
    &:hover { background: ${active ? t.accent + '20' : v.bgTertiary}; }
  `,
  scrollBtn: css`
    width: 22px; height: 26px; border: none; background: ${v.bg};
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: ${v.textTertiary}; flex-shrink: 0;
    border-radius: ${radius.sm}px;
    &:hover { color: ${v.text}; background: ${v.bgSecondary}; }
  `,
} as const;
