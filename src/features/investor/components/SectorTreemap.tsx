/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { memo, useLayoutEffect, useRef, useState } from 'react';
import { spacing, fontSize, fontWeight, radius } from '@/shared/styles/tokens';
import { Sector } from '@/shared/naver';
import { sem } from '@/shared/styles/semantic';
import { Tooltip } from '@/shared/ui/Tooltip';
import { squarify } from '../utils/squarify';

interface Props {
  sectors: Sector[];
  onSelect: (sector: Sector) => void;
}

/** 등락률(%) → heatmap 색상 토큰 */
const colorByChange = (rate: number): string => {
  if (rate >= 3) return sem.heatmap.upHeavy;
  if (rate >= 1.5) return sem.heatmap.upStrong;
  if (rate >= 0.5) return sem.heatmap.upMild;
  if (rate > 0) return sem.heatmap.upWeak;
  if (rate <= -3) return sem.heatmap.downHeavy;
  if (rate <= -1.5) return sem.heatmap.downStrong;
  if (rate <= -0.5) return sem.heatmap.downMild;
  if (rate < 0) return sem.heatmap.downWeak;
  return sem.bg.elevated;
};

/** 사인 붙은 등락률 문자열 */
const fmtChange = (rate: number): string => `${rate >= 0 ? '+' : ''}${rate.toFixed(2)}%`;

const PADDING = 2;

export const SectorTreemap = memo(({ sectors, onSelect }: Props) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // 컨테이너 크기 측정 + 리사이즈 추적
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const tiles = size.w > 0 && size.h > 0
    ? squarify(sectors.map(s => ({ value: s.marketCap, data: s })), size.w, size.h)
    : [];

  return (
    <div ref={wrapRef} css={s.wrap}>
      {tiles.map(t => {
        const bg = colorByChange(t.data.changeRate);
        // 폰트 단계 — 가로 또는 세로 중 하나만 충분히 크면 한 단계 위로.
        // (양쪽 다 작아야 작은 단계 — 길쭉한 타일도 시원하게 보이게 의도된 OR 비교)
        const sz: SizeStep = (t.w >= 220 || t.h >= 180) ? 'lg'
                            : (t.w >= 140 || t.h >= 110) ? 'md'
                            : (t.w >= 80 || t.h >= 60)  ? 'sm'
                            : 'xs';
        const rate = t.data.changeRate;
        const rateColor = rate > 0 ? sem.feedback.up : rate < 0 ? sem.feedback.down : sem.feedback.flat;
        const tipContent = (
          <>
            <div css={s.tipTitle}>
              {t.data.name}{' '}
              <span style={{ color: rateColor }}>{fmtChange(rate)}</span>
            </div>
            <div css={s.tipCounts}>
              <span style={{ color: sem.feedback.up }}>상승 {t.data.risingCount.toLocaleString()}</span>
              <span css={s.tipDot}> · </span>
              <span style={{ color: sem.feedback.flat }}>보합 {t.data.unchangedCount.toLocaleString()}</span>
              <span css={s.tipDot}> · </span>
              <span style={{ color: sem.feedback.down }}>하락 {t.data.fallingCount.toLocaleString()}</span>
            </div>
          </>
        );
        return (
          <Tooltip key={t.data.code} content={tipContent} position="top" delay={150}>
            <button type="button"
              onClick={() => onSelect(t.data)}
              css={s.tile}
              style={{
                left: t.x + PADDING, top: t.y + PADDING,
                width: Math.max(0, t.w - PADDING * 2), height: Math.max(0, t.h - PADDING * 2),
                background: bg,
              }}>
              <span css={s.name(sz)}>{t.data.name}</span>
              {sz !== 'xs' && <span css={s.rate(sz)}>{fmtChange(t.data.changeRate)}</span>}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
});

type SizeStep = 'xs' | 'sm' | 'md' | 'lg';
const NAME_SIZE: Record<SizeStep, number> = { xs: fontSize.xs, sm: fontSize.sm, md: fontSize.base, lg: fontSize.lg };
const RATE_SIZE: Record<SizeStep, number> = { xs: fontSize.xs, sm: fontSize.xs, md: fontSize.sm, lg: fontSize.base };

const s = {
  wrap: css`
    position: relative;
    width: 100%; height: 100%;
    background: ${sem.bg.base};
  `,
  tile: css`
    position: absolute;
    border: none; cursor: pointer;
    border-radius: ${radius.sm}px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: ${spacing.sm}px;
    color: ${sem.heatmap.text};
    overflow: hidden;
    font-family: inherit;
    transition: filter 0.15s;
    &:hover { filter: brightness(1.15); }
  `,
  name: (sz: SizeStep) => css`
    font-size: ${NAME_SIZE[sz]}px; font-weight: ${fontWeight.bold};
    line-height: 1.2; text-align: center;
    width: 100%;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  `,
  rate: (sz: SizeStep) => css`
    font-size: ${RATE_SIZE[sz]}px; font-weight: ${fontWeight.bold};
    margin-top: ${spacing.xs}px;
    font-variant-numeric: tabular-nums;
    color: ${sem.heatmap.text};
    opacity: 0.95;
  `,
  tipTitle: css`
    font-weight: ${fontWeight.bold};
    font-variant-numeric: tabular-nums;
    margin-bottom: ${spacing.sm}px;
  `,
  tipCounts: css`
    font-size: ${fontSize.xs}px; font-weight: ${fontWeight.semibold};
    font-variant-numeric: tabular-nums;
  `,
  tipDot: css`color: ${sem.text.tertiary}; font-weight: ${fontWeight.medium};`,
};
