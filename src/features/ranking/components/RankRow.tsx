/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FiExternalLink } from 'react-icons/fi';

import { spacing, fontSize, fontWeight, radius, height } from '@/shared/styles/tokens';
import { RankingItem } from '@/shared/naver';
import { NATION_BADGE, getLogoUrl, dirArrow } from '@/shared/utils/format';
import { StockLogo, AddButton } from '@/shared/ui';
import { sem } from '@/shared/styles/semantic';

interface RankRowProps {
  item: RankingItem;

  added: boolean;
  onLink: () => void;
  onToggle: () => void;
}

export const RankRow = ({ item, added, onLink, onToggle }: RankRowProps) => {
  const b = NATION_BADGE[item.nation] || { bg: '#8884', fg: '#888' };
  return (
    <div css={st.row}>
      <span css={st.rank(item.changeDirection)}>{item.rank}</span>
      <StockLogo
        src={getLogoUrl(item.nation, item.code, item.reutersCode)}
        fallbackChar={item.name.charAt(0)}
        fallbackBg={b.bg} fallbackFg={b.fg}
        size={height.segSm}
      />
      <div css={st.info}>
        <div css={st.nameRow}>
          <span css={st.name}>{item.name}</span>
          <span css={st.badge(b.bg, b.fg)}>{item.nation}</span>
        </div>
        <div css={st.subRow}>
          <span css={st.price}>{Number(item.price).toLocaleString()}</span>
          <span css={st.change(item.changeDirection)}>
            {dirArrow(item.changeDirection)}{parseFloat(item.changePercent).toFixed(2)}%
          </span>
        </div>
      </div>
      <button css={st.linkBtn} onClick={onLink}><FiExternalLink size={13} /></button>
      <AddButton added={added} onClick={onToggle} />
    </div>
  );
};

const st = {
  row: css`
    display: flex; align-items: center; padding: ${spacing.xl - 6}px ${spacing.xl}px; gap: ${spacing.xl - 6}px;
    border-bottom: 1px solid ${sem.border.subtle};
    &:hover { background: ${sem.bg.surface}; }
  `,
  rank: (d: 'up' | 'down' | 'flat') => css`
    width: ${spacing['2xl']}px; font-size: ${fontSize.base}px; font-weight: ${fontWeight.extrabold}; text-align: center; flex-shrink: 0;
    color: ${d === 'up' ? sem.feedback.up : d === 'down' ? sem.feedback.down : sem.text.tertiary};
  `,
  info: css`flex: 1; display: flex; flex-direction: column; gap: ${spacing.xs}px; min-width: 0;`,
  nameRow: css`display: flex; align-items: center; gap: ${radius.md}px;`,
  name: css`font-size: ${fontSize.base}px; font-weight: ${fontWeight.semibold}; color: ${sem.text.primary}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`,
  badge: (bg: string, fg: string) => css`padding: 1px 5px; border-radius: ${radius.sm}px; font-size: ${fontSize.xs}px; font-weight: ${fontWeight.bold}; background: ${bg}; color: ${fg}; flex-shrink: 0;`,
  subRow: css`display: flex; align-items: center; gap: ${spacing.md}px;`,
  price: css`font-size: ${fontSize.md}px; font-weight: ${fontWeight.bold}; color: ${sem.text.primary}; font-variant-numeric: tabular-nums;`,
  change: (d: 'up' | 'down' | 'flat') => css`font-size: ${fontSize.sm}px; font-weight: ${fontWeight.semibold}; color: ${d === 'up' ? sem.feedback.up : d === 'down' ? sem.feedback.down : sem.feedback.flat}; font-variant-numeric: tabular-nums;`,
  linkBtn: css`
    width: ${height.control}px; height: ${height.control}px; border: none; border-radius: ${radius.lg}px; cursor: pointer;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    background: ${sem.bg.elevated}; color: ${sem.text.secondary};
    &:hover { color: ${sem.text.primary}; }
  `,
};
