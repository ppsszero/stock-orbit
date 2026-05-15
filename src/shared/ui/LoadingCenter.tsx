/** @jsxImportSource @emotion/react */
import { css, keyframes } from '@emotion/react';
import { memo } from 'react';
import { spacing, fontSize, fontWeight } from '@/shared/styles/tokens';
import { sem } from '@/shared/styles/semantic';

interface Props {
  /** spinner 크기 (px). 기본 32 */
  size?: number;
  /** spinner 아래 표시할 로딩 텍스트. '\n'으로 줄바꿈 가능 */
  label?: string;
  /** true면 부모 flex container의 남은 공간 전체 차지 (flex:1 + 중앙 정렬) */
  fill?: boolean;
}

/**
 * 통합 로더 — accent ring spinner + 옵셔널 label.
 * 페이지 로딩 / 시트 내부 / 인라인 어디서나 동일 사용.
 */
export const LoadingCenter = memo(({ size = 32, label, fill = false }: Props) => (
  <div css={s.center(fill)}>
    <div css={s.spinner(size)} />
    {label && <div css={s.label}>{label}</div>}
  </div>
));

// 회전 keyframe — refresh 아이콘 등 다른 곳에서도 재사용
export const spinKeyframe = keyframes`to { transform: rotate(360deg); }`;
export const spinCss = css`animation: ${spinKeyframe} 1s linear infinite;`;

const s = {
  center: (fill: boolean) => css`
    display: flex; flex-direction: column;
    justify-content: center; align-items: center;
    gap: ${spacing.lg}px;
    ${fill ? 'flex: 1; min-height: 0;' : `padding: ${spacing['4xl']}px 0;`}
  `,
  spinner: (size: number) => {
    const borderWidth = Math.max(2, Math.round(size / 10));
    return css`
      width: ${size}px; height: ${size}px;
      border: ${borderWidth}px solid ${sem.action.primarySoft};
      border-top-color: ${sem.action.primary};
      border-radius: 50%;
      animation: ${spinKeyframe} 0.9s linear infinite;
    `;
  },
  label: css`
    font-size: ${fontSize.md}px;
    font-weight: ${fontWeight.medium};
    color: ${sem.text.tertiary};
    text-align: center;
    white-space: pre-line;
    line-height: 1.5;
  `,
};
