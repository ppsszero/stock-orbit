/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FiChevronUp, FiChevronDown } from 'react-icons/fi';

interface Props {
  /** 전체 박스 높이 (기본 13). 내부 chevron은 size*0.85로 계산. */
  size?: number;
}

/**
 * 위아래 화살표 합성 아이콘 (⌃⌄) — react-icons/fi에 단일 ArrowUpDown 없어서 자체 합성.
 * "순서 변경" / "재배치" / "정렬" 같은 메뉴에 사용.
 */
export const ReorderIcon = ({ size = 13 }: Props) => {
  const chevSize = Math.max(8, Math.round(size * 0.85));
  return (
    <span css={s.wrap(size)} aria-hidden="true">
      <FiChevronUp size={chevSize} />
      <FiChevronDown size={chevSize} />
    </span>
  );
};

const s = {
  wrap: (size: number) => css`
    display: inline-flex; flex-direction: column;
    align-items: center; justify-content: center;
    width: ${size}px; height: ${size}px;
    line-height: 0;
    & > svg { display: block; margin: -2px 0; }
  `,
};
