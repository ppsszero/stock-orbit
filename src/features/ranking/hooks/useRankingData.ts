import { useState, useEffect, useCallback } from 'react';
import { fetchDomesticRanking, fetchForeignRanking, RankingItem } from '@/shared/naver';
import { withMinSpin } from '@/shared/utils/withMinSpin';

export type Nation = 'KR' | 'USA' | 'CHN' | 'JPN' | 'HKG' | 'VNM';
export type RankType = 'volume' | 'value' | 'search';
/** 해외 endpoint는 searchTop 미지원 → 국내 전용 RankType */
export const isDomesticOnlyRank = (t: RankType): boolean => t === 'search';

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
  { key: 'value' as RankType,  label: '거래대금 상위' },
  { key: 'search' as RankType, label: '검색 상위' },
];

export function useRankingData(open: boolean) {
  const [nation, setNation] = useState<Nation>('KR');
  const [rankType, setRankType] = useState<RankType>('volume');
  const [items, setItems] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(false);

  // 검색 상위는 국내만 지원 — 다른 나라 선택 상태에서 검색 탭 진입 시 자동 KR로
  useEffect(() => {
    if (isDomesticOnlyRank(rankType) && nation !== 'KR') setNation('KR');
  }, [rankType, nation]);

  const load = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    const effectiveNation: Nation = isDomesticOnlyRank(rankType) ? 'KR' : nation;
    const result = await withMinSpin(() => effectiveNation === 'KR'
      ? fetchDomesticRanking(rankType)
      // 해외는 volume/value만 — search는 isDomesticOnlyRank로 차단됨
      : fetchForeignRanking(effectiveNation, rankType as 'volume' | 'value')
    );
    setItems(result);
    setLoading(false);
    return result.length > 0;
  }, [nation, rankType]);

  useEffect(() => { if (open) load(); }, [open, load]);

  return { nation, setNation, rankType, setRankType, items, loading, load };
}
