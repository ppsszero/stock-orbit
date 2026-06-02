import { logger } from '@/shared/utils/logger';
import { BASE, fetchJSON, num, parseDir } from './client';
import type {
  NaverPriceDirection,
  NaverForeignRankingRaw,
  NaverForeignRankingItemRaw,
  NaverDomesticRankingNewItem,
} from './types';

export interface RankingItem {
  rank: number;
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  changeDirection: 'up' | 'down' | 'flat';
  nation: string;
  reutersCode?: string;
  logoUrl?: string;
}

export const fetchDomesticRanking = async (type: 'volume' | 'value' | 'search'): Promise<RankingItem[]> => {
  const orderType = type === 'volume' ? 'quantTop' : type === 'value' ? 'priceTop' : 'searchTop';
  try {
    const data = await fetchJSON<NaverDomesticRankingNewItem[]>(
      `${BASE}/domestic/market/stock/default?tradeType=KRX&marketType=ALL&orderType=${orderType}&startIdx=0&pageSize=10`
    );
    const items = Array.isArray(data) ? data : [];
    return items.slice(0, 10).map((d, i) => {
      const ud = d.upDownGb;
      const dir = ud === '1' || ud === '2' ? 1 : ud === '4' || ud === '5' ? -1 : 0;
      const change = num(d.prevChangePrice);
      const changePct = num(d.prevChangeRate);
      return {
        rank: i + 1,
        code: d.itemcode || '',
        name: d.itemname || '',
        price: num(d.nowPrice),
        change: dir >= 0 ? change : -change,
        changePercent: dir >= 0 ? changePct : -changePct,
        changeDirection: parseDir(dir),
        nation: 'KR',
      };
    });
  } catch (e) {
    logger.error('국내 랭킹', (e as Error).message);
    return [];
  }
};

type ForeignNation = 'USA' | 'CHN' | 'JPN' | 'HKG' | 'VNM';
const NATION_MAP_REVERSE: Record<ForeignNation, string> = { USA: 'US', CHN: 'CN', JPN: 'JP', HKG: 'HK', VNM: 'VN' };

export const parseForeignDir = (val: NaverPriceDirection | string | undefined): number => {
  if (typeof val === 'string') {
    if (val === 'RISING' || val === 'UPPER_LIMIT') return 1;
    if (val === 'FALLING' || val === 'LOWER_LIMIT') return -1;
    return 0;
  }
  if (val?.code === '2' || val?.code === '1') return 1;
  if (val?.code === '5' || val?.code === '4') return -1;
  return 0;
};

export const fetchForeignRanking = async (nation: ForeignNation, type: 'volume' | 'value'): Promise<RankingItem[]> => {
  try {
    const orderType = type === 'volume' ? 'quantTop' : 'priceTop';
    const data = await fetchJSON<NaverForeignRankingRaw>(
      `${BASE}/foreign/market/stock/global?nation=${nation}&tradeType=ALL&orderType=${orderType}&startIdx=0&pageSize=10`
    );
    const items: NaverForeignRankingItemRaw[] = Array.isArray(data) ? data : (data.stocks || data.datas || []);
    return items.slice(0, 10).map((d, i) => {
      const dir = parseForeignDir(d.compareToPreviousPrice);
      return {
        rank: i + 1,
        code: d.symbolCode || d.stockCode || '',
        name: d.koreanCodeName || d.englishCodeName || d.stockName || '',
        price: num(d.currentPrice || d.closePrice),
        change: num(d.compareToPreviousClosePrice),
        changePercent: num(d.fluctuationsRatio),
        changeDirection: parseDir(dir),
        nation: NATION_MAP_REVERSE[nation] || 'US',
        reutersCode: d.reutersCode,
      };
    });
  } catch (e) {
    logger.error('해외 랭킹', (e as Error).message);
    return [];
  }
};
