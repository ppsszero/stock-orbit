/** @jsxImportSource @emotion/react */
import { css, keyframes } from '@emotion/react';
import { memo } from 'react';
import { FiLoader } from 'react-icons/fi';
import { spacing } from '@/shared/styles/tokens';
import { sem } from '@/shared/styles/semantic';

interface Props {
  size?: number;
}

/**
 * Atom: 중앙 정렬 로딩 스피너.
 * 5개 이상 Sheet에서 각자 정의하던 spin keyframe + center 레이아웃을 통합.
 */
export const LoadingCenter = memo(({ size = 20 }: Props) => (
  <div css={s.center}>
    <FiLoader size={size} css={s.spin} />
  </div>
));

export const spinKeyframe = keyframes`to { transform: rotate(360deg); }`;
export const spinCss = css`animation: ${spinKeyframe} 1s linear infinite;`;

const s = {
  center: css`
    display: flex; justify-content: center; align-items: center;
    padding: ${spacing['4xl']}px 0; color: ${sem.text.tertiary};
  `,
  spin: spinCss,
};
