/** @jsxImportSource @emotion/react */
import { css, keyframes } from '@emotion/react';
import { spacing, fontSize, fontWeight, radius, opacity } from '@/shared/styles/tokens';

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
  /** 진행 중(데이마켓 연결/로딩) 표시 — 점이 깜빡임 */
  pulse?: boolean;
  /** 라벨 크기 — 그리드뷰처럼 한 단계 작은 스케일에선 'xs'로 주변 코드 텍스트와 통일 */
  size?: 'sm' | 'xs';
}

export const StatusDot = ({ color, label, pulse = false, size = 'sm' }: StatusDotProps) => (
  <span css={s.status(color, size)}>
    <span css={s.dot(color, pulse)} />
    {label}
  </span>
);

const s = {
  badge: (bg: string, fg: string) => css`
    padding: 0 ${spacing.sm}px;
    /* 14px = 타이틀(fontSize.lg, lh 1) 박스와 동일 — 뱃지가 타이틀 baseline 아래로 하강하는 양을 줄여
       아랫줄(코드/세션라벨) 위 여백 비대칭 완화 */
    height: 14px;
    border-radius: ${radius.sm}px;
    font-size: ${fontSize.xs}px;
    font-weight: ${fontWeight.bold};
    /* height와 동일한 line-height → descender 공간까지 포함해 정중앙 배치 */
    line-height: 14px;
    background: ${bg};
    color: ${fg};
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  `,
  status: (color: string, size: 'sm' | 'xs') => css`
    font-size: ${fontSize[size]}px;
    font-weight: ${fontWeight.semibold};
    color: ${color};
    display: inline-flex;
    align-items: center;
    gap: ${spacing.xs + 1}px;
    /* 전역 line-height 상속 시 라벨 박스가 헐렁해져 글자가 위로 치우쳐 보임 — 주변(code/tag)과 동일하게 1 */
    line-height: 1;
  `,
  dot: (color: string, pulse: boolean) => css`
    width: 4px;
    height: 4px;
    border-radius: ${radius.full}px;
    background: ${color};
    /* 박스 중심 정렬 시 닷이 광학적으로 떠 보임 (리스트/그리드 공통) — 0.5px 아래 보정 */
    transform: translateY(0.5px);
    ${pulse && css`animation: ${blink} 1.1s ease-in-out infinite;`}
  `,
};

const blink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: ${opacity.pulse}; }
`;
