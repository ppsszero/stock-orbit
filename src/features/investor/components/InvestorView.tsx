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

// "+12,345" / "-1,000" / "0" 같은 표시 문자열에서 부호를 분리해 direction을 도출.
// 표시 문자열 역추론을 컴포넌트 안에서 inline 분기하지 않고 transform 단계로 일원화.
type Direction = 'up' | 'down' | 'flat';
const parseDirection = (value: string): Direction => {
  // 천 단위 콤마/공백 무시하고 첫 비공백 부호 문자만 판단
  const trimmed = value.trim();
  if (trimmed.startsWith('+')) return 'up';
  if (trimmed.startsWith('-')) {
    // "-0", "-0.00" 등 사실상 0인 케이스는 flat으로
    const num = parseFloat(trimmed);
    if (num === 0) return 'flat';
    return 'down';
  }
  return 'flat';
};

const directionColor = (d: Direction): string =>
  d === 'up' ? sem.feedback.up : d === 'down' ? sem.feedback.down : sem.text.primary;

const ValueRow = memo(({ items }: { items: { label: string; value: string }[] }) => (
  <div css={st.card}>
    {items.map((item, i) => {
      const color = directionColor(parseDirection(item.value));
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

const PLACEHOLDER: InvestorData = {
  dealTrend: { personal: '0', foreign: '0', institutional: '0' },
  programTrend: { arbitrage: '0', nonArbitrage: '0', total: '0' },
  upDown: { rise: 0, steady: 0, fall: 0, upper: 0, lower: 0 },
};

export const InvestorView = ({ data }: InvestorViewProps) => {
  const d = data ?? PLACEHOLDER;

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
  section: css`margin-bottom: ${spacing.lg}px;`,
  secT: sectionTitleStyle,
  card: css`
    display: flex; align-items: stretch;
    background: ${sem.surface.card};
    border-radius: ${radius.lg}px;
    margin: 0 ${spacing.xl}px;
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
  cellLabel: css`font-size: ${fontSize.sm}px; color: ${sem.text.secondary}; font-weight: ${fontWeight.semibold};`,
  cellVal: css`font-size: ${fontSize.lg}px; font-weight: ${fontWeight.extrabold}; font-variant-numeric: tabular-nums;`,
  bar: css`
    display: flex; height: ${spacing.md}px; border-radius: ${radius.sm}px; overflow: hidden;
    background: ${sem.bg.elevated}; margin: 0 ${spacing.xl}px ${spacing.md}px;
  `,
  barSeg: (color: string) => css`height: 100%; background: ${color}; transition: width 0.3s;`,
};
