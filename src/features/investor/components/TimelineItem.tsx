/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { memo } from 'react';
import { spacing, fontSize, fontWeight , sp } from '@/shared/styles/tokens';
import { TimelineRow } from '@/shared/ui';
import type { EconomicIndicator } from '@/shared/naver';
import { sem } from '@/shared/styles/semantic';

const NATION_FLAG_URL: Record<string, string> = {
  KR: 'https://ssl.pstatic.net/imgstock/fn/real/logo/flag/NationKOR.svg',
  US: 'https://ssl.pstatic.net/imgstock/fn/real/logo/flag/NationUSA.svg',
};

const IMPORTANCE_COLOR: Record<number, string> = {
  4: sem.action.danger, 3: sem.action.warning, 2: sem.text.secondary, 1: sem.text.tertiary,
};

const fmtVal = (val: number, unit: string): string =>
  val === 0 ? '-' : `${val}${unit}`;

const ValBlock = memo(({ label, value, highlight, color }: {
  label: string; value: string; highlight?: boolean; color?: string;
}) => (
  <div css={s.valBlock}>
    <span css={s.valLabel}>{label}</span>
    <span css={s.valNum(highlight, color)}>{value}</span>
  </div>
));

export const TimelineItem = memo(({ item, isLast }: { item: EconomicIndicator; isLast: boolean }) => {
  const impColor = IMPORTANCE_COLOR[item.importance] || '#555';
  const flagUrl = NATION_FLAG_URL[item.nation];

  const dotStyle = css`
    background: ${item.isReleased ? impColor : 'transparent'};
    border: 2px solid ${impColor};
  `;

  return (
    <TimelineRow dotStyle={dotStyle} isLast={isLast}>
      <span css={s.tlTime}>{item.releaseTime || '--:--'}</span>

      <div css={s.tlNameRow}>
        {flagUrl && <img src={flagUrl} alt={item.nationName} css={s.tlFlag} />}
        <span css={s.tlName}>{item.name}</span>
      </div>

      <div css={s.tlMeta}>
        <span css={s.tlImp(impColor)}>
          시장 영향력 {item.importance === 4 ? '매우 높음' : item.importance === 3 ? '높음' : item.importance === 2 ? '보통' : '낮음'}
        </span>
        {item.period && <span css={s.tlPeriod}>{item.period}</span>}
      </div>

      <div css={s.tlValues}>
        {item.isReleased ? (
          <>
            <ValBlock label="발표" value={fmtVal(item.actualValue, item.unit)} highlight />
            <ValBlock label="이전 발표" value={fmtVal(item.previousValue, item.unit)} />
            {item.changeValue !== 0 && (
              <ValBlock
                label="이전 대비"
                value={`${item.changeValue > 0 ? '+' : ''}${item.changeValue}${item.unit}`}
                color={item.changeValue > 0 ? sem.feedback.up : item.changeValue < 0 ? sem.feedback.down : undefined}
              />
            )}
          </>
        ) : (
          <ValBlock label="이전 발표" value={fmtVal(item.previousValue, item.unit)} />
        )}
      </div>
    </TimelineRow>
  );
});

const s = {
  tlTime: css`
    font-size: ${fontSize.sm}px; font-weight: ${fontWeight.bold}; color: ${sem.text.tertiary};
    font-variant-numeric: tabular-nums;
  `,
  tlNameRow: css`display: flex; align-items: center; gap: ${sp('sm', 'xs')};`,
  tlFlag: css`width: 18px; height: 18px; border-radius: 50%; object-fit: cover; flex-shrink: 0;`,
  tlName: css`
    font-size: ${fontSize.lg}px; font-weight: ${fontWeight.bold}; color: ${sem.text.primary};
    line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;
  `,
  tlMeta: css`display: flex; align-items: center; gap: ${spacing.md}px;`,
  tlImp: (color: string) => css`font-size: ${fontSize.xs}px; font-weight: ${fontWeight.semibold}; color: ${color};`,
  tlPeriod: css`font-size: ${fontSize.xs}px; color: ${sem.text.tertiary};`,
  tlValues: css`display: flex; align-items: baseline; gap: ${spacing['2xl']}px; margin-top: 2px;`,
  valBlock: css`display: flex; flex-direction: column; gap: ${spacing.sm}px;`,
  valLabel: css`font-size: 10px; color: ${sem.text.tertiary}; letter-spacing: 0.2px;`,
  valNum: (highlight?: boolean, color?: string) => css`
    font-size: ${highlight ? fontSize.xl : fontSize.base}px;
    font-weight: ${highlight ? fontWeight.extrabold : fontWeight.semibold};
    color: ${color || (highlight ? sem.text.primary : sem.text.secondary)};
    font-variant-numeric: tabular-nums;
  `,
};
