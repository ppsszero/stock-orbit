import { useState, useEffect, useCallback } from 'react';
import { fetchDomesticRanking, fetchForeignRanking, RankingItem } from '@/shared/naver';

export type Nation = 'KR' | 'USA' | 'CHN' | 'JPN' | 'HKG' | 'VNM';
export type RankType = 'volume' | 'value';

export const NATIONS = [
  { key: 'KR' as Nation, label: '국내' },
  { key: 'USA' as Nation, label: '미국' },
  { key: 'CHN' as Nation, label: '중국' },
  { key: 'JPN' as Nation, label: '일본' },
  { key: 'HKG' as Nation, label: '홍콩' },
  { key: 'VNM' as Nation, label: '베트남' },
];

export const RANK_TYPES = [
  { key: 'volume' as RankType, label: '거래량 상위' },
  { key: 'value' as RankType, label: '거래대금 상위' },
];

export function useRankingData(open: boolean) {
  const [nation, setNation] = useState<Nation>('KR');
  const [rankType, setRankType] = useState<RankType>('volume');
  const [items, setItems] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    const MIN_SPIN_MS = 400;
    const started = Date.now();
    const result = nation === 'KR'
      ? await fetchDomesticRanking(rankType)
      : await fetchForeignRanking(nation, rankType);
    const elapsed = Date.now() - started;
    if (elapsed < MIN_SPIN_MS) {
      await new Promise(r => setTimeout(r, MIN_SPIN_MS - elapsed));
    }
    setItems(result);
    setLoading(false);
    return result.length > 0;
  }, [nation, rankType]);

  useEffect(() => { if (open) load(); }, [open, load]);

  return { nation, setNation, rankType, setRankType, items, loading, load };
}
