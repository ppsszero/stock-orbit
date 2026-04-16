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

/* --- Value / Stat cards --- */

const ValueCard = memo(({ label, value }: { label: string; value: string }) => {
  const color = value.startsWith('+') ? sem.feedback.up : value.startsWith('-') ? sem.feedback.down : sem.text.primary;
  return (
    <div css={st.card}>
      <span css={st.cardLabel}>{label}</span>
      <span css={st.cardVal(color)}>{value}</span>
    </div>
  );
});

const StatCard = memo(({ label, value, color }: { label: string; value: string; color: string }) => (
  <div css={st.card}>
    <span css={st.cardLabel}>{label}</span>
    <span css={st.cardVal(color)}>{value}</span>
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
        <div css={st.grid3}>
          <ValueCard label="개인" value={d.dealTrend.personal} />
          <ValueCard label="외국인" value={d.dealTrend.foreign} />
          <ValueCard label="기관" value={d.dealTrend.institutional} />
        </div>
      </Section>

      <Section label="프로그램 매매">
        <div css={st.grid3}>
          <ValueCard label="차익" value={d.programTrend.arbitrage} />
          <ValueCard label="비차익" value={d.programTrend.nonArbitrage} />
          <ValueCard label="전체" value={d.programTrend.total} />
        </div>
      </Section>

      <Section label="등락종목">
        <UpDownBar rise={d.upDown.rise + d.upDown.upper} steady={d.upDown.steady} fall={d.upDown.fall + d.upDown.lower} />
        <div css={st.grid3}>
          <StatCard label="상승" value={`${d.upDown.rise.toLocaleString()}${d.upDown.upper > 0 ? `(${d.upDown.upper})` : ''}`} color={sem.feedback.up} />
          <StatCard label="보합" value={`${d.upDown.steady}`} color={sem.feedback.flat} />
          <StatCard label="하락" value={`${d.upDown.fall.toLocaleString()}${d.upDown.lower > 0 ? `(${d.upDown.lower})` : ''}`} color={sem.feedback.down} />
        </div>
      </Section>
    </>
  );
};

/* --- Styles --- */

const st = {
  empty: css`padding: ${spacing['5xl']}px; text-align: center; font-size: ${fontSize.base}px; color: ${sem.text.tertiary};`,
  section: css`margin-bottom: ${spacing.md}px;`,
  secT: sectionTitleStyle,
  grid3: css`display: grid; grid-template-columns: repeat(3, 1fr); gap: ${spacing.sm + spacing.xs}px; padding: 0 ${spacing.xl}px;`,
  card: css`
    background: ${sem.surface.card}; border: 1px solid ${sem.border.default}; border-radius: ${radius.xl}px;
    padding: ${spacing.xl - 6}px; display: flex; flex-direction: column; align-items: center; gap: ${spacing.sm}px;
  `,
  cardLabel: css`font-size: ${fontSize.sm}px; color: ${sem.text.tertiary}; font-weight: ${fontWeight.semibold};`,
  cardVal: (color: string) => css`font-size: ${fontSize.lg}px; font-weight: ${fontWeight.extrabold}; color: ${color}; font-variant-numeric: tabular-nums;`,
  bar: css`
    display: flex; height: ${spacing.md}px; border-radius: ${radius.sm}px; overflow: hidden;
    background: ${sem.bg.elevated}; margin: 0 ${spacing.xl}px ${spacing.md}px;
  `,
  barSeg: (color: string) => css`height: 100%; background: ${color}; transition: width 0.3s;`,
};
