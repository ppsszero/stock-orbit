/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useState, useCallback } from 'react';
import { spacing, fontSize, fontWeight } from '@/shared/styles/tokens';
import { MarqueeItem } from '@/shared/types';
import { SheetLayout, Tabs } from '@/shared/ui';
import { subTabPadStyle } from '@/shared/styles/sharedStyles';
import { useToast } from '@/shared/ui/Toast';
import { useInvestorData } from '@/features/investor/hooks/useInvestorData';
import { InvestorView } from '@/features/investor/components/InvestorView';
import { EconomicCalendar } from '@/features/investor/components/EconomicCalendar';
import { sem } from '@/shared/styles/semantic';
import { dirArrow, fmtPercentAbs, getDirColor } from '@/shared/utils/format';
import { formatMarqueeValue, formatMarqueeChange } from '@/features/marquee/utils/formatMarqueeValue';

interface Props { open: boolean; onClose: () => void; marqueeItems?: MarqueeItem[]; }

type Tab = 'market' | 'calendar';
type Market = 'KOSPI' | 'KOSDAQ';

const TABS = [
  { key: 'market' as Tab, label: '국내 매매동향' },
  { key: 'calendar' as Tab, label: '경제 캘린더' },
];
const MARKETS = [
  { key: 'KOSPI' as Market, label: '코스피' },
  { key: 'KOSDAQ' as Market, label: '코스닥' },
];

/** 마퀴 아이템에서 KOSPI/KOSDAQ 지수 데이터 추출 */
const IndexBanner = ({ items, market }: { items: MarqueeItem[]; market: Market }) => {
  const item = items.find(i => i.code === market);
  if (!item) return null;
  const dirColor = getDirColor(item.changeDirection);

  return (
    <div css={st.indexBanner}>
      <span css={st.indexLabel}>지수</span>
      <span css={st.indexValue}>{formatMarqueeValue(item)}</span>
      <span css={css`color: ${dirColor}; font-size: ${fontSize.sm}px; font-weight: ${fontWeight.semibold}; font-variant-numeric: tabular-nums;`}>
        {dirArrow(item.changeDirection)} {formatMarqueeChange(item)} ({fmtPercentAbs(item.changePercent)})
      </span>
    </div>
  );
};

export const InvestorSheet = ({ open, onClose, marqueeItems = [] }: Props) => {
  const [tab, setTab] = useState<Tab>('market');
  const [market, setMarket] = useState<Market>('KOSPI');
  const isMarketTab = tab === 'market';
  const isCalendarTab = tab === 'calendar';
  const { data, loading, refresh } = useInvestorData(open, !isMarketTab);
  const toast = useToast();

  const handleRefresh = useCallback(async () => {
    const ok = await refresh();
    toast.refreshResult(ok, '투자정보');
  }, [refresh, toast]);

  return (
    <SheetLayout
      open={open}
      title="투자정보"
      onClose={onClose}
      onRefresh={!isCalendarTab ? handleRefresh : undefined}
      refreshing={loading}
      noNavBorder
    >
      <Tabs id="investor" items={TABS} value={tab} onChange={setTab} variant="underline" itemAlign="center" />

      {isMarketTab ? (
        <>
          <div css={subTabPadStyle}>
            <Tabs id="investor-market" items={MARKETS} value={market} onChange={setMarket} variant="pill" size="sm" />
          </div>
          <IndexBanner items={marqueeItems} market={market} />
          <div role="tabpanel"
            id="investor-panel-market"
            aria-labelledby={`investor-tab-market investor-market-tab-${market}`}
            css={st.body}>
            <InvestorView data={data[market]} />
          </div>
        </>
      ) : (
        <div role="tabpanel" id="investor-panel-calendar" aria-labelledby="investor-tab-calendar" css={st.calendarPanel}>
          <EconomicCalendar />
        </div>
      )}
    </SheetLayout>
  );
};

/* --- Styles --- */
const st = {
  body: css`flex: 1; overflow-y: auto; padding: ${spacing.sm}px 0 ${spacing.lg}px;`,
  calendarPanel: css`flex: 1; display: flex; flex-direction: column; min-height: 0;`,
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
