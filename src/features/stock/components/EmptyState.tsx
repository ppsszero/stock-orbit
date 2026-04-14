/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FiTrendingUp } from 'react-icons/fi';
import { spacing, fontSize } from '@/shared/styles/tokens';
import { sem } from '@/shared/styles/semantic';

/**
 * 종목이 없을 때 표시하는 공통 빈 상태 컴포넌트.
 * StockList, StockGrid, StockTile 3곳에 동일하게 복제되어 있던 것을 통합.
 *
 * 구조 주의: 외부 div(empty)는 flex:1 그대로 두고, 내부 inner에만 translate를 건다.
 * 외부에 transform을 걸면 hit-test 좌표까지 이동해 위쪽 PresetTabs 클릭이 가로채진다.
 */
export const EmptyState = () => (
  <div css={s.empty}>
    <div css={s.inner}>
      <FiTrendingUp size={36} color={sem.text.tertiary} />
      <p>종목을 추가해보세요</p>
      <p css={s.hint}>아래 검색창에서 종목을 검색하세요</p>
    </div>
  </div>
);

const s = {
  empty: css`
    flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
    color: ${sem.text.secondary}; padding: ${spacing['5xl']}px ${spacing['2xl']}px;
  `,
  inner: css`
    display: flex; flex-direction: column; align-items: center;
    gap: ${spacing.md}px;
    /* Optical centering — 인접 요소(PresetTabs 등) hit-test 침범 없이 시각만 보정 */
    transform: translateY(-36%);
    p { margin: 0; font-size: ${fontSize.lg}px; }
  `,
  hint: css`font-size: ${fontSize.md}px !important; color: ${sem.text.tertiary} !important;`,
};
