import { useState, useCallback, useEffect } from 'react';
import { fetchInvestorData, InvestorData } from '@/shared/naver';
import { withMinSpin } from '@/shared/utils/withMinSpin';

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
    const [kospi, kosdaq] = await withMinSpin(() => Promise.all([
      fetchInvestorData('KOSPI'),
      fetchInvestorData('KOSDAQ'),
    ]));
    setData({ KOSPI: kospi, KOSDAQ: kosdaq });
    setLoading(false);
    return !!(kospi || kosdaq);
  }, []);

  useEffect(() => {
    if (open && !isCalendar) refresh();
  }, [open, isCalendar, refresh]);

  return { data, loading, refresh };
};
