import { useState, useCallback, useEffect, useRef } from 'react';
import { fetchSectors, SectorOverview, SectorNation } from '@/shared/naver';

const CACHE_TTL = 10 * 60 * 1000;

/** 섹터 데이터 — 활성 nation 기준 lazy fetch + 캐시 */
export const useSectorData = (active: boolean) => {
  const [nation, setNation] = useState<SectorNation>('domestic');
  const [byNation, setByNation] = useState<Partial<Record<SectorNation, SectorOverview | null>>>({});
  const [loading, setLoading] = useState(false);

  // 마지막 fetch 시각 — TTL 지나면 자동 재요청
  const fetchedAtRef = useRef<Partial<Record<SectorNation, number>>>({});

  const load = useCallback(async (target: SectorNation, force = false): Promise<boolean> => {
    const last = fetchedAtRef.current[target] || 0;
    if (!force && byNation[target] && Date.now() - last < CACHE_TTL) return !!byNation[target];
    setLoading(true);
    const data = await fetchSectors(target);
    fetchedAtRef.current[target] = Date.now();
    setByNation(prev => ({ ...prev, [target]: data }));
    setLoading(false);
    return !!(data && data.sectors.length > 0);
  }, [byNation]);

  // 활성 + nation 변경 시 fetch
  useEffect(() => {
    if (active) load(nation);
  }, [active, nation, load]);

  // 통합 새로고침 — 양쪽 nation 모두 force fetch (시트 단위 새로고침에서 호출)
  const refreshAll = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    const [dom, usa] = await Promise.all([fetchSectors('domestic'), fetchSectors('USA')]);
    const now = Date.now();
    fetchedAtRef.current = { domestic: now, USA: now };
    setByNation({ domestic: dom, USA: usa });
    setLoading(false);
    return !!((dom && dom.sectors.length > 0) || (usa && usa.sectors.length > 0));
  }, []);

  return {
    nation, setNation,
    overview: byNation[nation] ?? null,
    loading,
    refresh: () => load(nation, true),
    refreshAll,
  };
};
