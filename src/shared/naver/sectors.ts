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

export const fetchSectors = async (nation: SectorNation): Promise<SectorOverview | null> => {
  const extra = nation === 'domestic' ? '&sectorType=upjong' : '';
  try {
    const d = await fetchJSON<SectorOverviewRaw>(
      `${MOBILE_BASE}/front-api/stock/sectors/all/price?businessDayCategory=daily&nationType=${nation}&sectorSortType=MARKET_VALUE${extra}&page=1&pageSize=20`
    );
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
