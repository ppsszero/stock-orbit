/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useState } from 'react';
import { radius, fontWeight } from '@/shared/styles/tokens';

interface Props {
  src: string;
  fallbackChar: string;
  fallbackBg: string;
  fallbackFg: string;
  size?: number;
}

/** 종목 로고 (원형, 로드 실패 시 첫 글자 폴백) */
export const StockLogo = ({ src, fallbackChar, fallbackBg, fallbackFg, size = 28 }: Props) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div css={s.fallback(fallbackBg, fallbackFg, size)}>
        {fallbackChar}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      css={s.img(size)}
      onError={() => setFailed(true)}
    />
  );
};

const s = {
  img: (size: number) => css`
    width: ${size}px;
    height: ${size}px;
    border-radius: ${radius.full}px;
    object-fit: cover;
    background: rgba(128, 128, 128, 0.1);
    flex-shrink: 0;
  `,
  fallback: (bg: string, fg: string, size: number) => css`
    width: ${size}px;
    height: ${size}px;
    border-radius: ${radius.full}px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${bg};
    color: ${fg};
    font-size: ${Math.round(size * 0.43)}px;
    font-weight: ${fontWeight.bold};
    flex-shrink: 0;
  `,
};
