/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { memo } from 'react';
import { NaverAutoCompleteItem } from '@/shared/types';

import { spacing, fontSize, fontWeight, radius, height } from '@/shared/styles/tokens';
import { NATION_BADGE, mapNationCode, getLogoUrlFromAutoComplete } from '@/shared/utils/format';
import { StockLogo, AddButton } from '@/shared/ui';
import { sem } from '@/shared/styles/semantic';

interface Props {
  item: NaverAutoCompleteItem;
  added: boolean;
  selected: boolean;
  onToggle: (item: NaverAutoCompleteItem) => void;
}

export const SearchResultItem = memo(({ item, added, selected, onToggle }: Props) => {
  const nationLabel = mapNationCode(item.nationCode);
  const b = NATION_BADGE[nationLabel] || { bg: '#8884', fg: '#888' };

  return (
    <div
      css={[s.row, selected && s.rowSelected]}
      role="option"
      aria-selected={added}
      onClick={() => onToggle(item)}
    >
      <StockLogo
        src={getLogoUrlFromAutoComplete(item)}
        fallbackChar={item.name.charAt(0)}
        fallbackBg={b.bg}
        fallbackFg={b.fg}
        size={height.segSm}
      />
      <div css={s.left}>
        <div css={s.nameRow}>
          <span css={s.name}>{item.name}</span>
          <span css={css`padding:1px 5px;border-radius:4px;font-size:10px;font-weight:700;background:${b.bg};color:${b.fg};`}>
            {nationLabel}
          </span>
        </div>
        <div css={s.sub}>
          <span css={s.code}>{item.reutersCode || item.code}</span>
          {item.typeName && <span css={s.market}>{item.typeName}</span>}
        </div>
      </div>
      <AddButton
        added={added}
        ariaLabel={added ? `${item.name} 삭제` : `${item.name} 추가`}
        onClick={e => { e.stopPropagation(); onToggle(item); }}
      />
    </div>
  );
});

SearchResultItem.displayName = 'SearchResultItem';

const s = {
  row: css`display:flex;align-items:center;padding:${spacing.md + 2}px ${spacing.lg + 2}px;gap:${spacing.md + 2}px;border-bottom:1px solid ${sem.border.subtle};cursor:pointer;&:hover{background:${sem.bg.surface};}`,
  rowSelected: css`background:${sem.bg.surface};outline:2px solid ${sem.action.primaryStrong};outline-offset:-2px;border-radius:${radius.lg}px;`,
  left: css`display:flex;flex-direction:column;gap:${spacing.xs}px;min-width:0;flex:1;`,
  nameRow: css`display:flex;align-items:center;gap:${spacing.md - 2}px;`,
  name: css`font-size:${fontSize.lg}px;font-weight:${fontWeight.semibold};color:${sem.text.primary};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`,
  sub: css`display:flex;align-items:center;gap:${spacing.md}px;`,
  code: css`font-size:${fontSize.sm}px;color:${sem.text.tertiary};`,
  market: css`font-size:${fontSize.xs}px;color:${sem.text.tertiary};padding:1px ${spacing.sm}px;background:${sem.bg.elevated};border-radius:${radius.xs}px;`,
};
