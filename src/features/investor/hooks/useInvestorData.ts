import { useState, useCallback, useEffect } from 'react';
import { fetchInvestorData, InvestorData } from '@/shared/naver';

/**
 * KOSPI/KOSDAQ 투자자별 매매동향 데이터를 관리하는 훅.
 *
 * - open이 true이고 calendar 탭이 아닐 때 자동 fetch
 * - refresh 함수로 수동 재조회 가능
 */
export const useInvestorData = (open: boolean, isCalendar: boolean) => {
  const [data, setData] = useState<Record<string, InvestorData | null>>({ KOSPI: null, KOSDAQ: null });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    const MIN_SPIN_MS = 400;
    const started = Date.now();
    const [kospi, kosdaq] = await Promise.all([
      fetchInvestorData('KOSPI'),
      fetchInvestorData('KOSDAQ'),
    ]);
    const elapsed = Date.now() - started;
    if (elapsed < MIN_SPIN_MS) {
      await new Promise(r => setTimeout(r, MIN_SPIN_MS - elapsed));
    }
    setData({ KOSPI: kospi, KOSDAQ: kosdaq });
    setLoading(false);
    return !!(kospi || kosdaq);
  }, []);

  useEffect(() => {
    if (open && !isCalendar) refresh();
  }, [open, isCalendar, refresh]);

  return { data, loading, refresh };
};
