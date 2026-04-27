/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useEffect, useState } from 'react';
import { FiLoader } from 'react-icons/fi';
import { InterestRateItem, fetchStandardInterest, fetchDomesticInterest } from '@/shared/naver';
import { cached } from '@/shared/utils/cache';
import { spacing, fontSize, fontWeight } from '@/shared/styles/tokens';
import { sem } from '@/shared/styles/semantic';
import { spinCss } from '@/shared/ui/LoadingCenter';
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

const RateRow = ({ item, showFlag }: { item: InterestRateItem; showFlag?: boolean }) => {
  const dirColor = getDirColor(item.direction);
  const changeNum = parseFloat(item.change);
  const ratioDisplay = item.changeRatio === '-' ? '' : `(${item.changeRatio}%)`;

  return (
    <div css={s.row}>
      <div css={s.nameCol}>
        <div css={s.nameRow}>
          {showFlag && item.nation && (
            <img src={`${FLAG_BASE}${item.nation}.svg`} alt="" css={s.flag}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
          <div>
            <span css={s.name}>{item.name}</span>
            <div css={s.sub}>
              기준 {fmtIsoDate(item.date)}{showFlag && item.nextReleaseDate && ` · 다음 ${fmtDate(item.nextReleaseDate)}`}
            </div>
          </div>
        </div>
      </div>
      <div css={s.rateCol}>
        <span css={s.rate}>{item.rate}%</span>
      </div>
      <div css={s.changeColWide}>
        {changeNum !== 0 ? (
          <span css={css`color: ${dirColor}; font-size: ${fontSize.sm}px; font-weight: ${fontWeight.medium}; font-variant-numeric: tabular-nums;`}>
            {dirArrow(item.direction)} {Math.abs(changeNum).toFixed(3)} {ratioDisplay}
          </span>
        ) : (
          <span css={s.flat}>{parseFloat(item.change).toFixed(3)} {ratioDisplay}</span>
        )}
      </div>
    </div>
  );
};

interface Props {
  tab: 'standard' | 'domestic';
  refreshKey?: number;
  onLoadResult?: (ok: boolean) => void;
}

export const InterestRateView = ({ tab, refreshKey, onLoadResult }: Props) => {
  const [standard, setStandard] = useState<InterestRateItem[]>([]);
  const [domestic, setDomestic] = useState<InterestRateItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const isManualRefresh = (refreshKey ?? 0) > 0;
      const fetcher = tab === 'standard' ? fetchStandardInterest : fetchDomesticInterest;
      const setter = tab === 'standard' ? setStandard : setDomestic;
      setter([]);
      try {
        const data = await cached(`interest-${tab}`, fetcher, 10 * 60 * 1000, isManualRefresh);
        setter(data);
        if (isManualRefresh) onLoadResult?.(data.length > 0);
      } catch {
        if (isManualRefresh) onLoadResult?.(false);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tab, refreshKey, onLoadResult]);

  if (loading) {
    return (
      <div css={s.loading}>
        <FiLoader size={20} css={spinCss} />
        <span>금리 정보를 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div css={s.wrap}>
      {tab === 'standard' && standard.length === 0 && <div css={s.empty}>금리 데이터가 없어요</div>}
      {tab === 'standard' && standard.length > 0 && (
        <>
          <div css={s.header}>
            <span css={s.hName}>중앙은행</span>
            <span css={s.hRate}>금리</span>
            <span css={s.hChangeWide}>전회대비</span>
          </div>
          {standard.map(item => (
            <RateRow key={item.name} item={item} showFlag />
          ))}
        </>
      )}

      {tab === 'domestic' && domestic.length === 0 && <div css={s.empty}>금리 데이터가 없어요</div>}
      {tab === 'domestic' && domestic.length > 0 && (
        <>
          <div css={s.header}>
            <span css={s.hName}>금리종류</span>
            <span css={s.hRate}>금리</span>
            <span css={s.hChangeWide}>전일대비</span>
          </div>
          {domestic.map(item => (
            <RateRow key={item.name} item={item} />
          ))}
        </>
      )}
    </div>
  );
};

const s = {
  wrap: css`padding: ${spacing.sm}px 0 ${spacing.lg}px;`,
  empty: css`padding: ${spacing['4xl']}px; text-align: center; font-size: ${fontSize.base}px; color: ${sem.text.tertiary};`,
  loading: css`
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: ${spacing.md}px; padding: ${spacing['4xl']}px 0;
    color: ${sem.text.tertiary}; font-size: ${fontSize.base}px;
  `,
  header: css`
    display: flex; align-items: center; padding: ${spacing.md}px ${spacing.xl}px;
    border-bottom: 1px solid ${sem.border.subtle};
  `,
  hName: css`flex: 1; font-size: ${fontSize.xs}px; color: ${sem.text.tertiary};`,
  hRate: css`width: 65px; text-align: right; font-size: ${fontSize.xs}px; color: ${sem.text.tertiary};`,
  hChangeWide: css`width: 130px; text-align: right; font-size: ${fontSize.xs}px; color: ${sem.text.tertiary};`,
  row: css`
    display: flex; align-items: center; padding: ${spacing.lg}px ${spacing.xl}px;
    border-bottom: 1px solid ${sem.border.subtle};
  `,
  nameCol: css`flex: 1; min-width: 0;`,
  nameRow: css`display: flex; align-items: center; gap: ${spacing.md}px;`,
  flag: css`width: 20px; height: 20px; border-radius: 50%; object-fit: cover; flex-shrink: 0;`,
  name: css`font-size: ${fontSize.base}px; font-weight: ${fontWeight.semibold}; color: ${sem.text.primary};`,
  sub: css`font-size: ${fontSize.xs}px; color: ${sem.text.tertiary}; margin-top: 2px;`,
  rateCol: css`width: 65px; text-align: right;`,
  rate: css`font-size: ${fontSize.base}px; font-weight: ${fontWeight.bold}; color: ${sem.text.primary}; font-variant-numeric: tabular-nums;`,
  changeColWide: css`width: 130px; text-align: right;`,
  flat: css`font-size: ${fontSize.sm}px; color: ${sem.feedback.flat}; font-variant-numeric: tabular-nums;`,
};
