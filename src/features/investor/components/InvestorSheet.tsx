/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useState, useCallback, useMemo } from 'react';
import { spacing, fontSize, fontWeight } from '@/shared/styles/tokens';
import { MarqueeItem } from '@/shared/types';
import { SheetLayout, SegmentedControl } from '@/shared/ui';
import { useToast } from '@/shared/ui/Toast';
import { useInvestorData } from '@/features/investor/hooks/useInvestorData';
import { InvestorView } from '@/features/investor/components/InvestorView';
import { EconomicCalendar } from '@/features/investor/components/EconomicCalendar';
import { InterestRateView } from '@/features/investor/components/InterestRateView';
import { sem } from '@/shared/styles/semantic';
import { dirArrow } from '@/shared/utils/format';

interface Props { open: boolean; onClose: () => void; marqueeItems?: MarqueeItem[]; }

type Tab = 'market' | 'calendar' | 'interest';
type Market = 'KOSPI' | 'KOSDAQ';
type InterestTab = 'standard' | 'domestic';

const TABS = [
  { key: 'market' as Tab, label: '국내 매매동향' },
  { key: 'calendar' as Tab, label: '경제 캘린더' },
  { key: 'interest' as Tab, label: '금리' },
];
const MARKETS = [
  { key: 'KOSPI' as Market, label: '코스피' },
  { key: 'KOSDAQ' as Market, label: '코스닥' },
];
const INTEREST_TABS = [
  { key: 'standard' as InterestTab, label: '기준금리' },
  { key: 'domestic' as InterestTab, label: '국내금리' },
];

/** 마퀴 아이템에서 KOSPI/KOSDAQ 지수 데이터 추출 */
const IndexBanner = ({ items, market }: { items: MarqueeItem[]; market: Market }) => {
  const item = items.find(i => i.code === market);
  if (!item) return null;
  const dirColor = item.changeDirection === 'up' ? sem.feedback.up
    : item.changeDirection === 'down' ? sem.feedback.down : sem.feedback.flat;

  return (
    <div css={st.indexBanner}>
      <span css={st.indexLabel}>지수</span>
      <span css={st.indexValue}>{item.currentValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
      <span css={css`color: ${dirColor}; font-size: ${fontSize.sm}px; font-weight: ${fontWeight.semibold}; font-variant-numeric: tabular-nums;`}>
        {dirArrow(item.changeDirection)} {Math.abs(item.change).toFixed(2)} ({Math.abs(item.changePercent).toFixed(2)}%)
      </span>
    </div>
  );
};

export const InvestorSheet = ({ open, onClose, marqueeItems = [] }: Props) => {
  const [tab, setTab] = useState<Tab>('market');
  const [market, setMarket] = useState<Market>('KOSPI');
  const [interestTab, setInterestTab] = useState<InterestTab>('standard');
  const isMarketTab = tab === 'market';
  const isCalendarTab = tab === 'calendar';
  const { data, loading, refresh } = useInvestorData(open, !isMarketTab);
  const [interestRefreshKey, setInterestRefreshKey] = useState(0);
  const toast = useToast();

  const handleInterestResult = useCallback((ok: boolean) => {
    if (ok) toast.show('금리 정보를 새로 불러왔어요', 'success');
    else toast.show('금리 정보를 불러오지 못했어요', 'error');
  }, [toast]);

  const handleRefresh = useCallback(async () => {
    if (tab === 'interest') {
      setInterestRefreshKey(k => k + 1);
      return;
    }
    const ok = await refresh();
    if (ok) toast.show('투자정보를 새로 불러왔어요', 'success');
    else toast.show('투자정보를 불러오지 못했어요', 'error');
  }, [refresh, toast, tab]);

  return (
    <SheetLayout
      open={open}
      title="투자정보"
      onClose={onClose}
      onRefresh={!isCalendarTab ? handleRefresh : undefined}
      refreshing={loading}
    >
      <div css={st.segPadTop}>
        <SegmentedControl items={TABS} value={tab} onChange={setTab} />
      </div>

      {tab === 'market' ? (
        <>
          <div css={st.segPad}>
            <SegmentedControl items={MARKETS} value={market} onChange={setMarket} />
          </div>
          <IndexBanner items={marqueeItems} market={market} />
          <div css={st.body}>
            <InvestorView data={data[market]} />
          </div>
        </>
      ) : tab === 'calendar' ? (
        <EconomicCalendar />
      ) : (
        <>
          <div css={st.segPad}>
            <SegmentedControl items={INTEREST_TABS} value={interestTab} onChange={setInterestTab} />
          </div>
          <div css={st.body}>
            <InterestRateView tab={interestTab} refreshKey={interestRefreshKey} onLoadResult={handleInterestResult} />
          </div>
        </>
      )}
    </SheetLayout>
  );
};

/* --- Styles --- */
const st = {
  segPadTop: css`padding: ${spacing.lg}px ${spacing.xl}px ${spacing.md - 2}px; flex-shrink: 0;`,
  segPad: css`padding: 0 ${spacing.xl}px ${spacing.md - 2}px; flex-shrink: 0;`,
  body: css`flex: 1; overflow-y: auto; padding: ${spacing.sm}px 0 ${spacing.lg}px;`,
  indexBanner: css`
    display: flex; flex-direction: column; gap: ${spacing.sm}px;
    padding: ${spacing.lg}px ${spacing.xl}px ${spacing.md}px;
    flex-shrink: 0;
  `,
  indexLabel: css`
    font-size: ${fontSize.sm}px; font-weight: ${fontWeight.bold}; 
    color: ${sem.text.tertiary}; margin-bottom: ${spacing.xs}px;
  `,
  indexValue: css`font-size: ${fontSize['3xl']}px; font-weight: ${fontWeight.extrabold}; color: ${sem.text.primary}; font-variant-numeric: tabular-nums;`,
};
