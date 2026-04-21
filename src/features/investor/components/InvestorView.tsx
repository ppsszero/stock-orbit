/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { memo } from 'react';
import { spacing, fontSize, fontWeight, radius } from '@/shared/styles/tokens';
import { sectionTitleStyle } from '@/shared/styles/sharedStyles';
import type { InvestorData } from '@/shared/naver';
import { sem } from '@/shared/styles/semantic';

/* --- Section wrapper --- */

const Section = memo(({ label, children }: { label: string; children: React.ReactNode }) => (
  <div css={st.section}>
    <div css={st.secT}>{label}</div>
    {children}
  </div>
));

/* --- 3-column unified card with dividers --- */

const ValueRow = memo(({ items }: { items: { label: string; value: string }[] }) => (
  <div css={st.card}>
    {items.map((item, i) => {
      const color = item.value.startsWith('+') ? sem.feedback.up : item.value.startsWith('-') ? sem.feedback.down : sem.text.primary;
      return (
        <div key={item.label} css={st.cell}>
          {i > 0 && <div css={st.divider} />}
          <span css={st.cellLabel}>{item.label}</span>
          <span css={st.cellVal} style={{ color }}>{item.value}</span>
        </div>
      );
    })}
  </div>
));

const StatRow = memo(({ items }: { items: { label: string; value: string; color: string }[] }) => (
  <div css={st.card}>
    {items.map((item, i) => (
      <div key={item.label} css={st.cell}>
        {i > 0 && <div css={st.divider} />}
        <span css={st.cellLabel}>{item.label}</span>
        <span css={st.cellVal} style={{ color: item.color }}>{item.value}</span>
      </div>
    ))}
  </div>
));

/* --- Up/Down bar --- */

const UpDownBar = memo(({ rise, steady, fall }: { rise: number; steady: number; fall: number }) => {
  const total = rise + steady + fall || 1;
  return (
    <div css={st.bar}>
      {rise > 0 && <div css={st.barSeg(sem.feedback.up)} style={{ width: `${(rise / total) * 100}%` }} />}
      {steady > 0 && <div css={st.barSeg(sem.feedback.flat)} style={{ width: `${(steady / total) * 100}%` }} />}
      {fall > 0 && <div css={st.barSeg(sem.feedback.down)} style={{ width: `${(fall / total) * 100}%` }} />}
    </div>
  );
});

/* --- Main view --- */

interface InvestorViewProps {
  data: InvestorData | null;
}

export const InvestorView = ({ data: d }: InvestorViewProps) => {
  if (!d) {
    return <div css={st.empty}>데이터를 불러오는 중...</div>;
  }

  return (
    <>
      <Section label="투자자별 매매동향">
        <ValueRow items={[
          { label: '개인', value: d.dealTrend.personal },
          { label: '외국인', value: d.dealTrend.foreign },
          { label: '기관', value: d.dealTrend.institutional },
        ]} />
      </Section>

      <Section label="프로그램 매매">
        <ValueRow items={[
          { label: '차익', value: d.programTrend.arbitrage },
          { label: '비차익', value: d.programTrend.nonArbitrage },
          { label: '전체', value: d.programTrend.total },
        ]} />
      </Section>

      <Section label="등락종목">
        <UpDownBar rise={d.upDown.rise + d.upDown.upper} steady={d.upDown.steady} fall={d.upDown.fall + d.upDown.lower} />
        <StatRow items={[
          { label: '상승', value: `${d.upDown.rise.toLocaleString()}${d.upDown.upper > 0 ? `(${d.upDown.upper})` : ''}`, color: sem.feedback.up },
          { label: '보합', value: `${d.upDown.steady}`, color: sem.feedback.flat },
          { label: '하락', value: `${d.upDown.fall.toLocaleString()}${d.upDown.lower > 0 ? `(${d.upDown.lower})` : ''}`, color: sem.feedback.down },
        ]} />
      </Section>
    </>
  );
};

/* --- Styles --- */

const st = {
  empty: css`padding: ${spacing['5xl']}px; text-align: center; font-size: ${fontSize.base}px; color: ${sem.text.tertiary};`,
  section: css`margin-bottom: ${spacing.lg}px;`,
  secT: sectionTitleStyle,
  card: css`
    display: flex; align-items: stretch;
    background: transparent; border: 1px solid ${sem.border.default};
    border-radius: ${radius.xl}px; margin: 0 ${spacing.xl}px;
  `,
  cell: css`
    flex: 1; display: flex; flex-direction: column; align-items: center;
    gap: ${spacing.sm}px; padding: ${spacing.lg}px ${spacing.sm}px;
    position: relative;
  `,
  divider: css`
    position: absolute; left: 0; top: 20%; height: 60%;
    width: 1px; background: ${sem.border.muted};
  `,
  cellLabel: css`font-size: ${fontSize.sm}px; color: ${sem.text.tertiary}; font-weight: ${fontWeight.semibold};`,
  cellVal: css`font-size: ${fontSize.lg}px; font-weight: ${fontWeight.extrabold}; font-variant-numeric: tabular-nums;`,
  bar: css`
    display: flex; height: ${spacing.md}px; border-radius: ${radius.sm}px; overflow: hidden;
    background: ${sem.bg.elevated}; margin: 0 ${spacing.xl}px ${spacing.md}px;
  `,
  barSeg: (color: string) => css`height: 100%; background: ${color}; transition: width 0.3s;`,
};
