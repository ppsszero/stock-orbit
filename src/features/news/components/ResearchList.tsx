/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { memo } from 'react';
import { FiEye } from 'react-icons/fi';

import { spacing, fontSize, fontWeight } from '@/shared/styles/tokens';
import { ResearchItem } from '@/shared/naver';
import { MoreLink } from './MoreLink';
import { sem } from '@/shared/styles/semantic';

interface Props {
  items: ResearchItem[];
  moreLabel: string;
  moreUrl: string;
  onLinkClick: (url: string) => void;
}

const RESEARCH_BASE = 'https://m.stock.naver.com/research';

const getResearchUrl = (r: ResearchItem): string => {
  // endUrl이 있으면 그걸 사용, 없으면 카테고리+id로 조립
  return r.endUrl || `${RESEARCH_BASE}/${r.category}/${r.researchId}`;
};

export const ResearchList = memo(({ items, moreLabel, moreUrl, onLinkClick }: Props) => {
  if (items.length === 0) return <div css={s.empty}>리서치가 없습니다</div>;

  return (
    <>
      {items.map(r => (
        <div key={r.researchId} css={s.row}
          onClick={() => onLinkClick(getResearchUrl(r))}>
          <div css={s.title}>{r.title}</div>
          <div css={s.meta}>
            <span css={s.broker}>{r.brokerName}</span>
            {r.itemName && <span css={s.tag}>{r.itemName}</span>}
            <span css={s.date}>{r.writeDate}</span>
            {r.readCount && (
              <span css={s.read}>
                <FiEye size={11} />
                {r.readCount}
              </span>
            )}
          </div>
        </div>
      ))}
      <MoreLink label={moreLabel} onClick={() => onLinkClick(moreUrl)} />
    </>
  );
});

const s = {
  empty: css`padding:${spacing['5xl']}px;text-align:center;font-size:${fontSize.base}px;color:${sem.text.tertiary};`,
  row: css`
    display: flex; flex-direction: column; gap: ${spacing.sm}px;
    padding: ${spacing.lg}px ${spacing.xl}px;
    cursor: pointer;
    &:hover { background: ${sem.action.primarySoft}; }
  `,
  title: css`
    font-size: ${fontSize.lg}px; font-weight: ${fontWeight.semibold};
    color: ${sem.text.primary}; line-height: 1.5;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  `,
  meta: css`
    display: flex; align-items: center; gap: ${spacing.md}px;
    font-size: ${fontSize.sm}px; color: ${sem.text.tertiary};
    flex-wrap: wrap;
  `,
  broker: css`color: ${sem.text.secondary}; font-weight: ${fontWeight.semibold};`,
  tag: css`color: ${sem.action.primary}; font-weight: ${fontWeight.semibold};`,
  date: css``,
  read: css`display: flex; align-items: center; gap: 3px;`,
};
