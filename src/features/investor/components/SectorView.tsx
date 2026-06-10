/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useEffect, useState } from 'react';
import { spacing, fontSize, fontWeight } from '@/shared/styles/tokens';
import { Sector, SectorNation } from '@/shared/naver';
import { Tabs, LoadingCenter } from '@/shared/ui';
import { subTabPadStyle } from '@/shared/styles/sharedStyles';
import { useStore } from '@/app/store';
import { useSectorData } from '../hooks/useSectorData';
import { SectorTreemap } from './SectorTreemap';
import { SectorDetail } from './SectorDetail';
import { sem } from '@/shared/styles/semantic';

interface Props {
  active: boolean;
  /** 종목 클릭 시 시트 전체를 덮는 WebViewPanel 트리거 (상위 시트에서 관리) */
  onStockClick: (url: string) => void;
  /** 시트 단위 새로고침 trigger — 값이 바뀔 때마다 모든 nation force fetch */
  refreshSignal?: number;
}

const NATIONS: { key: SectorNation; label: string }[] = [
  { key: 'domestic', label: '국내' },
  { key: 'USA',      label: '미국' },
];

export const SectorView = ({ active, onStockClick, refreshSignal }: Props) => {
  const sectorCount = useStore(s => s.settings.sectorCount);
  const { nation, setNation, overview, loading, refreshAll } = useSectorData(active, sectorCount);
  const [selected, setSelected] = useState<Sector | null>(null);

  // 외부 시그널로 양쪽 nation 모두 force fetch
  useEffect(() => {
    if (refreshSignal && refreshSignal > 0) refreshAll();
  }, [refreshSignal, refreshAll]);

  return (
    <>
      <div css={subTabPadStyle}>
        <Tabs id="sector-nation" items={NATIONS} value={nation} onChange={n => { setNation(n); setSelected(null); }} variant="pill" size="sm" />
      </div>
      {overview && !loading && (
        <div css={s.summary}>
          <span css={s.stat}>
            <span css={s.statLabel}>상승</span>
            <span css={s.statNum(sem.feedback.up)}>{overview.totalRisingCount.toLocaleString()}</span>
          </span>
          <span css={s.dot}>·</span>
          <span css={s.stat}>
            <span css={s.statLabel}>보합</span>
            <span css={s.statNum(sem.feedback.flat)}>{overview.totalUnchangedCount.toLocaleString()}</span>
          </span>
          <span css={s.dot}>·</span>
          <span css={s.stat}>
            <span css={s.statLabel}>하락</span>
            <span css={s.statNum(sem.feedback.down)}>{overview.totalFallingCount.toLocaleString()}</span>
          </span>
        </div>
      )}
      <div css={s.body}>
        {loading
          ? <LoadingCenter fill />
          : overview && overview.sectors.length > 0
            ? <SectorTreemap sectors={overview.sectors} onSelect={setSelected} />
            : <div css={s.empty}>섹터 데이터를 불러오지 못했어요</div>
        }
      </div>
      <SectorDetail sector={selected} nation={nation} onClose={() => setSelected(null)} onStockClick={onStockClick} />
    </>
  );
};

const s = {
  summary: css`
    display: flex; align-items: baseline; gap: ${spacing.md}px;
    padding: ${spacing.sm}px ${spacing.xl}px ${spacing.md}px ;
    flex-shrink: 0;
  `,
  stat: css`
    display: inline-flex; align-items: baseline; gap: ${spacing.sm}px;
  `,
  statLabel: css`
    font-size: ${fontSize.sm}px; color: ${sem.text.tertiary};
    font-weight: ${fontWeight.medium};
  `,
  statNum: (color: string) => css`
    font-size: ${fontSize.xl}px; color: ${color};
    font-weight: ${fontWeight.extrabold};
    font-variant-numeric: tabular-nums;
  `,
  dot: css`color: ${sem.text.tertiary}; font-size: ${fontSize.sm}px;`,
  body: css`
    flex: 1; min-height: 0;
    padding: 0 ${spacing.xl}px ${spacing.xl}px;
    display: flex; flex-direction: column;
  `,
  empty: css`
    flex: 1; display: flex; align-items: center; justify-content: center;
    color: ${sem.text.tertiary}; font-size: ${fontSize.base}px;
  `,
};
