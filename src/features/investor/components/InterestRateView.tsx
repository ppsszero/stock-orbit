/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useEffect, useState } from 'react';
import { InterestRateItem, fetchStandardInterest, fetchDomesticInterest, fetchBondYield } from '@/shared/naver';
import { cached } from '@/shared/utils/cache';
import { spacing, fontSize, fontWeight, radius } from '@/shared/styles/tokens';
import { sem } from '@/shared/styles/semantic';
import { LoadingCenter } from '@/shared/ui/LoadingCenter';
import { WebViewPanel } from '@/shared/ui';
import { dirArrow, getDirColor } from '@/shared/utils/format';

/** YYYYMMDD → MM.DD. */
const fmtDate = (d: string): string => {
  if (!d || d.length < 8) return d;
  return `${d.slice(4, 6)}.${d.slice(6, 8)}.`;
};

/** ISO → MM.DD. */
const fmtIsoDate = (d: string): string => {
  if (!d) return '';
  const parts = d.split('-');
  if (parts.length < 3) return d;
  return `${parts[1]}.${parts[2]}.`;
};

const FLAG_BASE = 'https://ssl.pstatic.net/imgstock/fn/real/logo/flag/Nation';

const RateRow = ({ item, showFlag, onClick }: { item: InterestRateItem; showFlag?: boolean; onClick?: () => void }) => {
  const dirColor = getDirColor(item.direction);
  const changeNum = parseFloat(item.change);
  const ratioDisplay = item.changeRatio === '-' ? '' : ` (${item.changeRatio}%)`;

  return (
    <div css={s.row} onClick={onClick} role={onClick ? 'button' : undefined}>
      {showFlag && item.nation && (
        <img src={`${FLAG_BASE}${item.nation}.svg`} alt="" css={s.flag}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      )}
      <div css={s.info}>
        <div css={s.name}>{item.name}</div>
        <div css={s.sub}>기준 {fmtIsoDate(item.date)}</div>
        {showFlag && item.nextReleaseDate && (
          <div css={s.next}>다음 {fmtDate(item.nextReleaseDate)}</div>
        )}
      </div>
      <div css={s.values}>
        <div css={s.rate} style={{ color: dirColor }}>{item.rate}%</div>
        {changeNum !== 0 ? (
          <div css={css`color: ${dirColor}; font-size: ${fontSize.sm}px; font-weight: ${fontWeight.medium}; font-variant-numeric: tabular-nums;`}>
            {dirArrow(item.direction)} {Math.abs(changeNum).toFixed(3)}{ratioDisplay}
          </div>
        ) : (
          <div css={s.flat}>0.000{ratioDisplay}</div>
        )}
      </div>
    </div>
  );
};

type Tab = 'bond' | 'standard' | 'domestic';

interface Props {
  tab: Tab;
  refreshKey?: number;
  onLoadResult?: (ok: boolean) => void;
}

// tab → (fetcher, 깃발 표시 여부, 라벨) 매핑
const TAB_CONFIG: Record<Tab, { fetcher: () => Promise<InterestRateItem[]>; showFlag: boolean; label: string }> = {
  bond:     { fetcher: fetchBondYield,         showFlag: true,  label: '국채수익률' },
  standard: { fetcher: fetchStandardInterest,  showFlag: true,  label: '기준금리'   },
  domestic: { fetcher: fetchDomesticInterest,  showFlag: false, label: '국내금리'   },
};

const getRateUrl = (tab: Tab, item: InterestRateItem): string | null => {
  if (tab === 'standard' && item.nation) {
    return `https://m.stock.naver.com/marketindex/standardInterest/${item.nation}`;
  }
  if (tab === 'bond' && item.code) {
    return `https://m.stock.naver.com/marketindex/bond/${item.code}`;
  }
  if (tab === 'domestic' && item.code) {
    return `https://m.stock.naver.com/marketindex/domesticInterest/${item.code}`;
  }
  return null;
};

export const InterestRateView = ({ tab, refreshKey, onLoadResult }: Props) => {
  const [items, setItems] = useState<InterestRateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<{ url: string; title: string; sub: string } | null>(null);

  useEffect(() => {
    // 빠른 탭 전환 시 이전 fetch 응답이 늦게 도착해 잘못된 setState 하는 것 방지.
    let stale = false;

    const load = async () => {
      setLoading(true);
      setItems([]);
      const isManualRefresh = (refreshKey ?? 0) > 0;
      const { fetcher } = TAB_CONFIG[tab];
      try {
        const data = await cached(`interest-${tab}`, fetcher, 10 * 60 * 1000, isManualRefresh);
        if (stale) return;
        setItems(data);
        if (isManualRefresh) onLoadResult?.(data.length > 0);
      } catch {
        if (stale) return;
        if (isManualRefresh) onLoadResult?.(false);
      } finally {
        if (!stale) setLoading(false);
      }
    };
    load();

    return () => { stale = true; };
  }, [tab, refreshKey, onLoadResult]);

  if (loading) {
    return <LoadingCenter fill label="금리 정보를 불러오는 중..." />;
  }

  const { showFlag, label } = TAB_CONFIG[tab];

  return (
    <div css={s.wrap}>
      {items.length === 0 && <div css={s.empty}>데이터가 없어요</div>}
      {items.map(item => {
        const url = getRateUrl(tab, item);
        return (
          <RateRow key={item.name} item={item} showFlag={showFlag}
            onClick={url ? () => setView({ url, title: item.name, sub: label }) : undefined} />
        );
      })}
      <WebViewPanel url={view?.url ?? null} title={view?.title} subtitle={view?.sub}
        onClose={() => setView(null)} />
    </div>
  );
};

const s = {
  wrap: css`
    display: flex; flex-direction: column;
    padding: ${spacing.sm}px ${spacing.xl}px ${spacing.lg}px;
  `,
  empty: css`padding: ${spacing['4xl']}px; text-align: center; font-size: ${fontSize.base}px; color: ${sem.text.tertiary};`,
  row: css`
    display: flex; align-items: center; gap: ${spacing.lg}px;
    padding: ${spacing.xl}px ${spacing.lg}px;
    border-radius: ${radius.lg}px;
    cursor: pointer;
    &:not(:last-of-type) { border-bottom: 1px dotted ${sem.border.muted}; }
    &:hover { background: ${sem.action.primarySelected}; }
  `,
  flag: css`width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0;`,
  info: css`
    flex: 1; min-width: 0;
    display: flex; flex-direction: column; gap: ${spacing.sm}px;
  `,
  name: css`
    font-size: ${fontSize.base}px; font-weight: ${fontWeight.semibold}; color: ${sem.text.primary};
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  `,
  sub: css`font-size: ${fontSize.xs}px; color: ${sem.text.tertiary};`,
  next: css`font-size: ${fontSize.xs}px; color: ${sem.action.warning}; font-weight: ${fontWeight.bold};`,
  values: css`
    display: flex; flex-direction: column; align-items: flex-end; gap:${spacing.xs}px;
    flex-shrink: 0;
  `,
  rate: css`font-size: ${fontSize.xl}px; font-weight: ${fontWeight.extrabold}; color: ${sem.text.primary}; font-variant-numeric: tabular-nums; line-height: 1.1;`,
  flat: css`font-size: ${fontSize.sm}px; color: ${sem.feedback.flat}; font-variant-numeric: tabular-nums;`,
};
