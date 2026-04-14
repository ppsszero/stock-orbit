/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useState, useCallback } from 'react';
import { spacing } from '@/shared/styles/tokens';
import { SheetLayout, SegmentedControl } from '@/shared/ui';
import { useToast } from '@/shared/ui/Toast';
import { useInvestorData } from '@/features/investor/hooks/useInvestorData';
import { InvestorView } from '@/features/investor/components/InvestorView';
import { EconomicCalendar } from '@/features/investor/components/EconomicCalendar';

interface Props { open: boolean; onClose: () => void; }

type Tab = 'KOSPI' | 'KOSDAQ' | 'calendar';
const TABS = [
  { key: 'KOSPI' as Tab, label: 'KOSPI' },
  { key: 'KOSDAQ' as Tab, label: 'KOSDAQ' },
  { key: 'calendar' as Tab, label: '경제 캘린더' },
];

export const InvestorSheet = ({ open, onClose }: Props) => {
  const [tab, setTab] = useState<Tab>('KOSPI');
  const isCalendar = tab === 'calendar';
  const { data, loading, refresh } = useInvestorData(open, isCalendar);
  const toast = useToast();

  const handleRefresh = useCallback(async () => {
    const ok = await refresh();
    if (ok) toast.show('투자정보를 새로 불러왔어요', 'success');
    else toast.show('투자정보를 불러오지 못했어요', 'error');
  }, [refresh, toast]);

  return (
    <SheetLayout
      open={open}
      title="투자정보"
      onClose={onClose}
      onRefresh={!isCalendar ? handleRefresh : undefined}
      refreshing={loading}
    >
      <div css={st.segPad}>
        <SegmentedControl items={TABS} value={tab} onChange={setTab} size="md" />
      </div>

      {isCalendar ? (
        <EconomicCalendar />
      ) : (
        <div css={st.body}>
          <InvestorView data={data[tab]} />
        </div>
      )}
    </SheetLayout>
  );
};

/* --- Styles --- */
const st = {
  segPad: css`padding: ${spacing.xl - 6}px ${spacing.xl}px 0; flex-shrink: 0;`,
  body: css`flex: 1; overflow-y: auto; padding: ${spacing.sm}px 0 ${spacing.lg}px;`,
};
