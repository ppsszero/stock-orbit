/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { memo } from 'react';
import { FiEye } from 'react-icons/fi';

import { spacing, fontSize, fontWeight, radius } from '@/shared/styles/tokens';
import { MoneyStory } from '@/shared/naver';
import { MoreLink } from './MoreLink';
import { sem } from '@/shared/styles/semantic';

interface Props {
  items: MoneyStory[];

  maxed: boolean;
  onLinkClick: (url: string) => void;
}

export const StoryList = memo(({ items, maxed, onLinkClick }: Props) => {
  if (items.length === 0) return <div css={s.empty}>콘텐츠가 없습니다</div>;

  return (
    <>
      {items.map(m => (
        <div key={m.id} css={s.row}
          onClick={() => onLinkClick(`https://story.pay.naver.com/content/${m.id}_${m.channelId}_C${m.mainCategoryId}`)}>
          {m.imageUrl && <img src={m.imageUrl} alt="" css={s.img} />}
          <div css={s.content}>
            <span css={s.category}>{m.categoryName}</span>
            <span css={s.title}>{m.title}</span>
            <span css={s.teaser}>{m.teaser}</span>
            <div css={s.meta}>
              <span>{m.channelName}</span>
              <FiEye size={10} />
              <span>{m.viewCount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      ))}
      {maxed && (
        <MoreLink
          label="머니스토리 더보기"
          onClick={() => onLinkClick('https://story.pay.naver.com/popular')}
        />
      )}
    </>
  );
});

const s = {
  empty: css`padding:${spacing['5xl']}px;text-align:center;font-size:${fontSize.base}px;color:${sem.text.tertiary};`,
  row: css`
    display:flex;flex-direction:column;gap:${spacing.md}px;padding:${spacing.lg}px ${spacing.xl}px;
    border-bottom:1px solid ${sem.border.subtle};cursor:pointer;&:hover{background:${sem.bg.surface};}
  `,
  img: css`width:100%;height:120px;border-radius:${radius.xl}px;object-fit:cover;`,
  content: css`display:flex;flex-direction:column;gap:${spacing.xs}px;`,
  category: css`font-size:${fontSize.sm}px;font-weight:${fontWeight.bold};color:${sem.action.primary};`,
  title: css`font-size:${fontSize.xl}px;font-weight:${fontWeight.bold};color:${sem.text.primary};line-height:1.5;`,
  teaser: css`font-size:${fontSize.base}px;color:${sem.text.secondary};line-height:1.6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;`,
  meta: css`display:flex;align-items:center;gap:${spacing.sm}px;font-size:${fontSize.sm}px;color:${sem.text.tertiary};margin-top:${spacing.xs}px;`,
};
