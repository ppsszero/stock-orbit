/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { memo } from 'react';
import { FiClock } from 'react-icons/fi';

import { spacing, fontSize, fontWeight, radius } from '@/shared/styles/tokens';
import { NewsArticle, NewsRelatedItem } from '@/shared/naver';
import { formatTime } from '../utils/formatTime';
import { MoreLink } from './MoreLink';
import { sem } from '@/shared/styles/semantic';

interface Props {
  items: NewsArticle[];
  moreLabel: string;
  moreUrl: string;
  onLinkClick: (url: string) => void;
}

/** 종목 칩: 제목 위에 표기. 클릭 시 해당 종목 페이지(endUrl)로 이동 — 기사 본문 진입 방지 */
const RelatedChips = ({ items, onLinkClick }: { items: NewsRelatedItem[]; onLinkClick: (url: string) => void }) => (
  <div css={s.related}>
    {items.map(it => {
      const pct = parseFloat(it.fluctuationsRatio || '0');
      const dir = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat';
      const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '';
      return (
        <button key={it.reutersCode}
          type="button"
          css={s.chip(dir)}
          onClick={e => { e.stopPropagation(); if (it.endUrl) onLinkClick(it.endUrl); }}>
          <span>{it.itemName}</span>
          <span>{arrow}{Math.abs(pct).toFixed(2)}%</span>
        </button>
      );
    })}
  </div>
);

export const NewsList = memo(({ items, moreLabel, moreUrl, onLinkClick }: Props) => {
  if (items.length === 0) return <div css={s.empty}>뉴스가 없습니다</div>;

  return (
    <>
      {items.map(a => (
        <div key={a.officeId + a.articleId} css={s.row}
          onClick={() => onLinkClick(a.url)}>
          <div css={s.content}>
            {a.relatedItems && a.relatedItems.length > 0 && (
              <RelatedChips items={a.relatedItems} onLinkClick={onLinkClick} />
            )}
            <span css={s.title}>{a.title}</span>
            <span css={s.sub}>{a.subcontent}</span>
            <div css={s.meta}>
              <span>{a.officeHname}</span>
              <FiClock size={10} />
              <span>{formatTime(a.datetime)}</span>
            </div>
          </div>
          {a.thumbUrl && (
            <img src={a.thumbUrl} alt="" css={s.thumb}
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          )}
        </div>
      ))}
      <MoreLink label={moreLabel} onClick={() => onLinkClick(moreUrl)} />
    </>
  );
});

const s = {
  empty: css`padding:${spacing['5xl']}px;text-align:center;font-size:${fontSize.base}px;color:${sem.text.tertiary};`,
  row: css`
    display:flex;gap:${spacing.md + 2}px;padding:${spacing.lg}px ${spacing.xl}px;
    cursor:pointer;
    &:hover{background:${sem.action.primarySoft};}
  `,
  content: css`flex:1;display:flex;flex-direction:column;gap:${spacing.sm}px;min-width:0;`,
  title: css`font-size:${fontSize.xl}px;font-weight:${fontWeight.semibold};color:${sem.text.primary};line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;`,
  sub: css`font-size:${fontSize.base}px;color:${sem.text.tertiary};line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;`,
  meta: css`display:flex;align-items:center;gap:${spacing.sm}px;font-size:${fontSize.sm}px;color:${sem.text.tertiary};margin-top:${spacing.xs}px;`,
  thumb: css`width:72px;height:72px;border-radius:${radius.lg}px;object-fit:cover;flex-shrink:0;`,
  related: css`
    display:flex;flex-wrap:wrap;gap:${spacing.xs + 1}px;
    margin-bottom:${spacing.xs}px;
  `,
  // 등락 방향에 따라 배경 tint와 글자색 모두 같은 hue로 — 한눈에 직관적
  chip: (dir: 'up'|'down'|'flat') => {
    const isUp = dir === 'up';
    const isDown = dir === 'down';
    const accent = isUp ? sem.feedback.up : isDown ? sem.feedback.down : null;
    const bg = accent ? `color-mix(in srgb, ${accent} 12%, transparent)` : sem.bg.elevated;
    const bgHover = accent ? `color-mix(in srgb, ${accent} 20%, transparent)` : sem.bg.surface;
    const fg = accent ?? sem.text.secondary;
    return css`
      display:inline-flex;align-items:center;gap:${spacing.xs + 1}px;
      padding:2px ${spacing.sm + 1}px;
      border-radius:${radius.md}px;
      font-size:${fontSize.xs}px;font-weight:${fontWeight.semibold};
      background:${bg};
      color:${fg};
      border:none;cursor:pointer;font-family:inherit;
      font-variant-numeric:tabular-nums;
      &:hover{ background:${bgHover}; }
    `;
  },
};
