/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useEffect, useState } from 'react';
import { spacing, fontSize, fontWeight } from '@/shared/styles/tokens';
import { Sector, SectorNation } from '@/shared/naver';
import { Tabs, LoadingCenter } from '@/shared/ui';
import { subTabPadStyle } from '@/shared/styles/sharedStyles';
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
  const { nation, setNation, overview, loading, refreshAll } = useSectorData(active);
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
          <span><span css={css`color:${sem.feedback.up};font-weight:${fontWeight.bold};`}>상승 {overview.totalRisingCount.toLocaleString()}</span></span>
          <span css={s.dot}>·</span>
          <span css={s.flat}>보합 {overview.totalUnchangedCount.toLocaleString()}</span>
          <span css={s.dot}>·</span>
          <span><span css={css`color:${sem.feedback.down};font-weight:${fontWeight.bold};`}>하락 {overview.totalFallingCount.toLocaleString()}</span></span>
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
    display: flex; align-items: center; gap: ${spacing.sm}px;
    padding: ${spacing.md}px ${spacing.xl}px ${spacing.md}px;
    font-size: ${fontSize.sm}px; color: ${sem.text.secondary};
    flex-shrink: 0;
  `,
  dot: css`color: ${sem.text.tertiary};`,
  flat: css`color: ${sem.feedback.flat}; font-weight: ${fontWeight.semibold};`,
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
