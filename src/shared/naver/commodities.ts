import { MarqueeItem } from '@/shared/types';
import { logger } from '@/shared/utils/logger';
import { BASE, fetchJSON, num, parseDir } from './client';
import type { NaverCommodityItemRaw } from './types';

type CommodityCategory = 'energy' | 'metals' | 'agricultural' | 'transport';
const COMMODITY_CATEGORIES: CommodityCategory[] = ['energy', 'metals', 'agricultural', 'transport'];

export const parseCommodityItem = (d: NaverCommodityItemRaw, type: MarqueeItem['type']): MarqueeItem => {
  const c = num(d.fluctuations);
  const p = num(d.fluctuationsRatio);
  const dir = d.fluctuationsType?.code === '2' ? 1 : d.fluctuationsType?.code === '5' ? -1 : 0;
  return {
    code: d.reutersCode || d.symbolCode || '',
    name: d.name || d.symbolCode || '',
    currentValue: num(d.closePrice),
    change: dir >= 0 ? c : -c,
    changePercent: dir >= 0 ? p : -p,
    changeDirection: parseDir(dir),
    type,
  };
};

export const fetchCommodities = async (): Promise<MarqueeItem[]> => {
  const out: MarqueeItem[] = [];
  const results = await Promise.all(
    COMMODITY_CATEGORIES.map(async (cat) => {
      try {
        const arr = await fetchJSON<NaverCommodityItemRaw[]>(`${BASE}/securityService/marketindex/${cat}`);
        return { cat, items: Array.isArray(arr) ? arr : [] };
      } catch (e) {
        logger.error(`원자재 ${cat}`, (e as Error).message);
        return { cat, items: [] as NaverCommodityItemRaw[] };
      }
    })
  );
  for (const { cat, items } of results) {
    for (const d of items) out.push(parseCommodityItem(d, cat));
  }
  return out;
};
