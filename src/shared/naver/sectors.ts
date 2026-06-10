import { logger } from '@/shared/utils/logger';
import { MOBILE_BASE, fetchJSON, num } from './client';
import type { SectorOverviewRaw } from './types';

export type SectorNation = 'domestic' | 'USA';

export interface SectorStock {
  name: string;
  code: string;
  reutersCode?: string;
  currentPrice: number;
  currency: string;
  changePercent: number;
  changeAbs: string;
  direction: 'up' | 'down' | 'flat';
  nation: string;
}

export interface Sector {
  code: string;
  name: string;
  changeRate: number;
  marketCap: number;
  risingCount: number;
  unchangedCount: number;
  fallingCount: number;
  topStocks: SectorStock[];
}

export interface SectorOverview {
  totalRisingCount: number;
  totalUnchangedCount: number;
  totalFallingCount: number;
  sectors: Sector[];
}

export const dirFromFluctuationsType = (t?: string): 'up' | 'down' | 'flat' =>
  t === 'RISING' ? 'up' : t === 'FALLING' ? 'down' : 'flat';

/**
 * 증시현황(섹터) 표시 가능 최대 개수 (nation별).
 * 네이버 API는 존재하는 업종 수보다 많이 요청하면 capping이 아니라 **빈 배열**을 반환 →
 * 상한을 넘기면 트리맵이 통째로 비어버림. 그래서 nation별 실측 상한으로 고정.
 * (국내 업종 31, 해외 섹터 33 — 2026-06 실측)
 */
export const SECTOR_MAX: Record<SectorNation, number> = { domestic: 31, USA: 33 };

export const fetchSectors = async (nation: SectorNation, count = 20): Promise<SectorOverview | null> => {
  const extra = nation === 'domestic' ? '&sectorType=upjong' : '';
  const pageSize = Math.min(Math.max(Math.floor(count) || 20, 1), SECTOR_MAX[nation] ?? 31);
  const fetchRaw = (ps: number) => fetchJSON<SectorOverviewRaw>(
    `${MOBILE_BASE}/front-api/stock/sectors/all/price?businessDayCategory=daily&nationType=${nation}&sectorSortType=MARKET_VALUE${extra}&page=1&pageSize=${ps}`
  );
  try {
    let d = await fetchRaw(pageSize);
    // 빈 응답(상한 초과 / 향후 업종수 변동 등) → 안전값 20으로 1회 fallback. 빈 트리맵 방지.
    if (!d.result?.sectors?.length && pageSize > 20) d = await fetchRaw(20);
    const r = d.result;
    if (!r) return null;
    return {
      totalRisingCount: r.totalRisingCount ?? 0,
      totalUnchangedCount: r.totalUnChangedCount ?? 0,
      totalFallingCount: r.totalFallingCount ?? 0,
      sectors: (r.sectors || []).map(s => ({
        code: s.sectorCode ?? '',
        name: s.sectorName ?? '',
        changeRate: s.changeRate ?? 0,
        marketCap: s.totalMarketCap ?? 0,
        risingCount: s.risingCount ?? 0,
        unchangedCount: s.unChangedCount ?? 0,
        fallingCount: s.fallingCount ?? 0,
        topStocks: (s.items || []).map(it => {
          const dir = dirFromFluctuationsType(it.fluctuationsType);
          const pct = num(it.fluctuationsRatio);
          return {
            name: it.name ?? '',
            code: it.itemCode || it.id || '',
            reutersCode: it.reutersCode,
            currentPrice: it.currentPrice ?? 0,
            currency: it.currencyType ?? 'KRW',
            changePercent: dir === 'down' ? -pct : pct,
            changeAbs: it.fluctuations ?? '0',
            direction: dir,
            nation: it.nationType === 'USA' ? 'US' : nation === 'domestic' ? 'KR' : 'US',
          };
        }),
      })),
    };
  } catch (e) {
    logger.error(`섹터 ${nation}`, (e as Error).message);
    return null;
  }
};
