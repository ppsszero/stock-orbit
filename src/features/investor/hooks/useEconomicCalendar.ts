import { useState, useMemo, useCallback, useEffect } from 'react';
import { fetchEconomicCalendar, EconomicIndicator } from '@/shared/naver';

/** 날짜를 'YYYYMMDD' 형식으로 변환 */
const toDateStr = (d: Date): string =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

/** 'YYYYMMDD'를 Date로 변환 */
const fromDateStr = (s: string): Date =>
  new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)));

/** 날짜를 '04.09(수)' 같은 표시 형식으로 */
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
export const formatDisplayDate = (dateStr: string): string => {
  const d = fromDateStr(dateStr);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}.${mm}.${dd}.(${WEEKDAYS[d.getDay()]})`;
};

/**
 * 경제 캘린더 데이터 + 날짜 네비게이션 훅.
 *
 * - 오늘 기준 ±1개월 범위만 지원
 * - 날짜 변경 시 자동 fetch
 * - isToday: 현재 선택된 날짜가 오늘인지
 */
// NOTE: React Query를 쓰지 않은 이유 — 날짜가 빠르게 변하는 단일 시트 전용 데이터라
// 캐싱 이점이 없고, stale/refetch 전략이 오히려 복잡해짐. 단순 useState + useEffect로 충분.
export const useEconomicCalendar = () => {
  const today = useMemo(() => toDateStr(new Date()), []);
  const [dateStr, setDateStr] = useState(today);
  const [items, setItems] = useState<EconomicIndicator[]>([]);
  const [loading, setLoading] = useState(false);

  // ±1개월 범위 계산
  const { minDate, maxDate } = useMemo(() => {
    const now = new Date();
    const min = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const max = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    return { minDate: toDateStr(min), maxDate: toDateStr(max) };
  }, []);

  const isToday = dateStr === today;
  const canPrev = dateStr > minDate;
  const canNext = dateStr < maxDate;

  const goTo = useCallback((newDate: string) => {
    if (newDate >= minDate && newDate <= maxDate) setDateStr(newDate);
  }, [minDate, maxDate]);

  const goPrev = useCallback(() => {
    const d = fromDateStr(dateStr);
    d.setDate(d.getDate() - 1);
    goTo(toDateStr(d));
  }, [dateStr, goTo]);

  const goNext = useCallback(() => {
    const d = fromDateStr(dateStr);
    d.setDate(d.getDate() + 1);
    goTo(toDateStr(d));
  }, [dateStr, goTo]);

  const goToday = useCallback(() => setDateStr(today), [today]);

  // 데이터 fetch
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchEconomicCalendar(dateStr).then(data => {
      if (!cancelled) {
        setItems(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [dateStr]);

  // 시간순 정렬 (이미 발표된 항목 먼저, 그 안에서 시간순)
  const sorted = useMemo(() =>
    [...items].sort((a, b) => {
      // 발표된 것 → 예정인 것 순
      if (a.isReleased !== b.isReleased) return a.isReleased ? -1 : 1;
      return a.releaseTime.localeCompare(b.releaseTime);
    }),
    [items],
  );

  return {
    dateStr,
    displayDate: formatDisplayDate(dateStr),
    items: sorted,
    loading,
    isToday,
    canPrev,
    canNext,
    minDate,
    maxDate,
    goPrev,
    goNext,
    goToday,
    goTo,
  };
};
