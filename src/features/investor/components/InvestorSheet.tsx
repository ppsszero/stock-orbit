/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useState, useCallback, useEffect } from 'react';
import { spacing, fontSize, fontWeight } from '@/shared/styles/tokens';
import { MarqueeItem } from '@/shared/types';
import { SheetLayout, Tabs, WebViewPanel, ListHeader } from '@/shared/ui';
import { subTabPadStyle } from '@/shared/styles/sharedStyles';
import { useToast } from '@/shared/ui/Toast';
import { useWebViewState } from '@/shared/hooks/useWebViewState';
import { useInvestorData } from '@/features/investor/hooks/useInvestorData';
import { InvestorView } from '@/features/investor/components/InvestorView';
import { EconomicCalendar } from '@/features/investor/components/EconomicCalendar';
import { SectorView } from '@/features/investor/components/SectorView';
import { sem } from '@/shared/styles/semantic';
import { dirArrow, fmtPercentAbs, getDirColor } from '@/shared/utils/format';
import { formatMarqueeValue, formatMarqueeChange } from '@/features/marquee/utils/formatMarqueeValue';

interface Props { open: boolean; onClose: () => void; marqueeItems?: MarqueeItem[]; }

type Tab = 'market' | 'calendar' | 'sectors';
type Market = 'KOSPI' | 'KOSDAQ';

const TABS = [
  { key: 'market' as Tab, label: '매매동향' },
  { key: 'sectors' as Tab, label: '증시현황' },
  { key: 'calendar' as Tab, label: '경제캘린더' },
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
      <ListHeader caps title={<ListHeader.Title size="sm" color={sem.text.tertiary}>지수</ListHeader.Title>} />
      <div css={st.indexBody}>
        <span css={st.indexValue}>{formatMarqueeValue(item)}</span>
        <span css={css`color: ${dirColor}; font-size: ${fontSize.sm}px; font-weight: ${fontWeight.semibold}; font-variant-numeric: tabular-nums;`}>
          {dirArrow(item.changeDirection)} {formatMarqueeChange(item)} ({fmtPercentAbs(item.changePercent)})
        </span>
      </div>
    </div>
  );
};

export const InvestorSheet = ({ open, onClose, marqueeItems = [] }: Props) => {
  const [tab, setTab] = useState<Tab>('market');
  const [market, setMarket] = useState<Market>('KOSPI');
  const isMarketTab = tab === 'market';
  const isCalendarTab = tab === 'calendar';
  const isSectorsTab = tab === 'sectors';
  const { data, loading, refresh } = useInvestorData(open, !isMarketTab);
  const { view, open: openView, close: closeView } = useWebViewState(open);
  const toast = useToast();
  // 시트 단위 새로고침 — 자식(SectorView, EconomicCalendar)에게 signal 전파
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const handleRefresh = useCallback(async () => {
    const ok = await refresh();
    setRefreshSignal(s => s + 1);
    setLastUpdatedAt(new Date());
    toast.refreshResult(ok, '투자정보');
  }, [refresh, toast]);

  useEffect(() => {
    if (open && !loading && !lastUpdatedAt) setLastUpdatedAt(new Date());
  }, [open, loading, lastUpdatedAt]);

  return (
    <SheetLayout
      open={open}
      title="투자정보"
      onClose={onClose}
      onRefresh={handleRefresh}
      refreshing={loading}
      lastUpdatedAt={lastUpdatedAt}
      noNavBorder
    >
      <Tabs id="investor" items={TABS} value={tab} onChange={setTab} variant="underline" itemAlign="center" />

      {isMarketTab && (
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
      )}

      {isCalendarTab && (
        <div role="tabpanel" id="investor-panel-calendar" aria-labelledby="investor-tab-calendar" css={st.calendarPanel}>
          <EconomicCalendar refreshSignal={refreshSignal} />
        </div>
      )}

      {isSectorsTab && (
        <div role="tabpanel" id="investor-panel-sectors" aria-labelledby="investor-tab-sectors" css={st.sectorsPanel}>
          <SectorView active={open && isSectorsTab} onStockClick={openView} refreshSignal={refreshSignal} />
        </div>
      )}

      <WebViewPanel url={view?.url ?? null} onClose={closeView} />
    </SheetLayout>
  );
};

/* --- Styles --- */
const st = {
  body: css`flex: 1; overflow-y: auto; padding: ${spacing.sm}px 0 ${spacing.lg}px;`,
  calendarPanel: css`flex: 1; display: flex; flex-direction: column; min-height: 0;`,
  sectorsPanel: css`flex: 1; display: flex; flex-direction: column; min-height: 0; position: relative;`,
  indexBanner: css`
    display: flex; flex-direction: column;
    flex-shrink: 0;
  `,
  /* ListHeader 아래에 가격/변동 — 좌측 패딩 xl로 ListHeader와 정렬 */
  indexBody: css`
    display: flex; flex-direction: column; gap: ${spacing.sm}px;
    padding: 0 ${spacing.xl}px ${spacing.md}px;
  `,
  indexValue: css`font-size: ${fontSize['3xl']}px; font-weight: ${fontWeight.extrabold}; color: ${sem.text.primary}; font-variant-numeric: tabular-nums;`,
};
