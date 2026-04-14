/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { memo } from 'react';
import { FiClock } from 'react-icons/fi';

import { spacing, fontSize, fontWeight, radius } from '@/shared/styles/tokens';
import { NewsArticle, getNewsUrl } from '@/shared/naver';
import { formatTime } from '../utils/formatTime';
import { MoreLink } from './MoreLink';
import { sem } from '@/shared/styles/semantic';

interface Props {
  items: NewsArticle[];

  maxed: boolean;
  onLinkClick: (url: string) => void;
}

export const NewsList = memo(({ items, maxed, onLinkClick }: Props) => {
  if (items.length === 0) return <div css={s.empty}>뉴스가 없습니다</div>;

  return (
    <>
      {items.map(a => (
        <div key={a.officeId + a.articleId} css={s.row}
          onClick={() => onLinkClick(getNewsUrl(a.officeId, a.articleId))}>
          <div css={s.content}>
            <span css={s.title}>{a.title}</span>
            <span css={s.sub}>{a.subcontent}</span>
            <div css={s.meta}>
              <span>{a.officeHname}</span>
              <FiClock size={10} />
              <span>{formatTime(a.datetime)}</span>
            </div>
          </div>
          {a.thumbUrl && <img src={a.thumbUrl} alt="" css={s.thumb} />}
        </div>
      ))}
      {maxed && (
        <MoreLink
          label="메인뉴스 더보기"
          onClick={() => onLinkClick('https://news.naver.com/section/101')}
        />
      )}
    </>
  );
});

const s = {
  empty: css`padding:${spacing['5xl']}px;text-align:center;font-size:${fontSize.base}px;color:${sem.text.tertiary};`,
  row: css`
    display:flex;gap:${spacing.md + 2}px;padding:${spacing.lg}px ${spacing.xl}px;
    border-bottom:1px solid ${sem.border.subtle};cursor:pointer;
    &:hover{background:${sem.bg.surface};}
  `,
  content: css`flex:1;display:flex;flex-direction:column;gap:${spacing.sm}px;min-width:0;`,
  title: css`font-size:${fontSize.xl}px;font-weight:${fontWeight.semibold};color:${sem.text.primary};line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;`,
  sub: css`font-size:${fontSize.base}px;color:${sem.text.tertiary};line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;`,
  meta: css`display:flex;align-items:center;gap:${spacing.sm}px;font-size:${fontSize.sm}px;color:${sem.text.tertiary};margin-top:${spacing.xs}px;`,
  thumb: css`width:72px;height:72px;border-radius:${radius.lg}px;object-fit:cover;flex-shrink:0;`,
};
