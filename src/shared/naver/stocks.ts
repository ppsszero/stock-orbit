import { StockPrice, NaverAutoCompleteResponse, NaverAutoCompleteItem } from '@/shared/types';
import { logger } from '@/shared/utils/logger';
import { BASE, fetchJSON } from './client';
import { parsePollingData } from './polling';
import type { NaverPollingResponse } from './types';

const OVERSEAS_POLLING_BASE = 'https://polling.finance.naver.com/api/realtime/worldstock/stock';

export const searchStocks = async (query: string): Promise<NaverAutoCompleteItem[]> => {
  if (!query.trim()) return [];
  const data = await fetchJSON<NaverAutoCompleteResponse>(
    `${BASE}/autocomplete/search/autoComplete?query=${encodeURIComponent(query)}&target=stock%2Cindex%2Cmarketindicator%2Ccoin%2Cipo`
  );
  const items = data.result?.items || [];
  logger.info('Search', `"${query}" → ${items.length}건`);
  return items;
};

/** 국내주식 배치 polling — 10개씩, code→StockPrice 맵 */
export const fetchDomesticStocksBatch = async (codes: string[]): Promise<Record<string, StockPrice>> => {
  const out: Record<string, StockPrice> = {};
  if (codes.length === 0) return out;
  try {
    const resp = await fetchJSON<NaverPollingResponse>(
      `${BASE}/polling/domestic/stock?itemCodes=${encodeURIComponent(codes.join(','))}`
    );
    for (const d of resp.datas || []) {
      const code = d.itemCode || d.symbolCode || '';
      if (code) out[code] = parsePollingData(d, code, 'stock');
    }
  } catch (e) {
    logger.error('국내주식 배치조회 실패', `${codes.join(',')}: ${(e as Error).message}`);
  }
  return out;
};

/** 해외주식 배치 polling — 10개씩 */
export const fetchOverseasStocksBatch = async (reutersCodes: string[]): Promise<Record<string, StockPrice>> => {
  const out: Record<string, StockPrice> = {};
  if (reutersCodes.length === 0) return out;
  try {
    const resp = await fetchJSON<NaverPollingResponse>(
      `${OVERSEAS_POLLING_BASE}/${encodeURIComponent(reutersCodes.join(','))}`
    );
    for (const d of resp.datas || []) {
      const rc = d.reutersCode || '';
      const code = d.symbolCode || rc.split('.')[0] || '';
      if (code) out[code] = parsePollingData(d, code, 'stock');
    }
  } catch (e) {
    logger.error('해외주식 배치조회 실패', `${reutersCodes.join(',')}: ${(e as Error).message}`);
  }
  return out;
};
