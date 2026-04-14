/** @jsxImportSource @emotion/react */
import { css, keyframes } from '@emotion/react';
import { useEffect, useRef } from 'react';
import { dirSign, fmtPercent } from '@/shared/utils/format';
import { MarqueeItem } from '@/shared/types';
import { groupMarqueeItems } from '@/features/marquee/utils/groupMarqueeItems';
import { spacing, fontSize, fontWeight, radius } from '@/shared/styles/tokens';
import { sectionTitleStyle } from '@/shared/styles/sharedStyles';
import { SheetLayout } from '@/shared/ui';
import { sem } from '@/shared/styles/semantic';

interface Props {
  open: boolean; items: MarqueeItem[];
  highlightCode?: string | null;
  onClose: () => void;
}

export const MarqueeSheet = ({ open, items, highlightCode, onClose }: Props) => {
  const highlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && highlightCode && highlightRef.current) {
      setTimeout(() => highlightRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 150);
    }
  }, [open, highlightCode]);

  if (!open) return null;
  const g = groupMarqueeItems(items);

  return (
    <SheetLayout open={open} title="시세 전체보기" onClose={onClose}>
      <div css={s.body}>
        {g.index.length > 0 && <Section label="주요 지수" items={g.index} highlightCode={highlightCode} highlightRef={highlightRef} />}
        {g.commodity.length > 0 && <Section label="원자재" items={g.commodity} highlightCode={highlightCode} highlightRef={highlightRef} />}
        {g.fx.length > 0 && <Section label="환율" items={g.fx} highlightCode={highlightCode} highlightRef={highlightRef} />}
      </div>
    </SheetLayout>
  );
};

const Section = ({ label, items, highlightCode, highlightRef }: {
  label: string; items: MarqueeItem[];
  highlightCode?: string | null;
  highlightRef: React.RefObject<HTMLDivElement>;
}) => (
  <div>
    <div css={sectionTitleStyle}>{label}</div>
    {items.map(i => {
      const isHL = i.code === highlightCode;
      return (
        <div key={i.code}
          ref={isHL ? (highlightRef as React.RefObject<HTMLDivElement>) : undefined}
          css={[s.row, isHL && s.highlight]}>
          <span css={s.name}>{i.name}</span>
          <div css={s.vals}>
            <span css={s.val}>{i.currentValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            <span css={s.chg(i.changeDirection)}>
              {dirSign(i.changeDirection)}{Math.abs(i.change).toFixed(2)} ({fmtPercent(i.changeDirection, i.changePercent)})
            </span>
          </div>
        </div>
      );
    })}
  </div>
);

const glow = keyframes`
  0% { background-color: transparent; }
  20% { background-color: var(--hl-color); }
  100% { background-color: transparent; }
`;

const s = {
  body: css`flex:1;overflow-y:auto;padding:${spacing.sm}px 0 ${spacing.md}px;`,
  row: css`display:flex;align-items:center;justify-content:space-between;padding:${spacing.md}px ${spacing.xl}px;border-radius:${radius.lg}px;&:hover{background:${sem.bg.surface};}`,
  highlight: css`
    --hl-color: ${sem.action.primaryHover};
    animation: ${glow} 1.5s ease;
    border-radius: ${radius.lg}px;
  `,
  name: css`font-size:${fontSize.base}px;font-weight:${fontWeight.semibold};color:${sem.text.primary};`,
  vals: css`display:flex;flex-direction:column;align-items:flex-end;gap:1px;`,
  val: css`font-size:${fontSize.base}px;font-weight:${fontWeight.bold};color:${sem.text.primary};font-variant-numeric:tabular-nums;`,
  chg: (d: 'up'|'down'|'flat') => css`font-size:${fontSize.sm}px;color:${d==='up'?sem.feedback.up:d==='down'?sem.feedback.down:sem.feedback.flat};font-variant-numeric:tabular-nums;`,
};
