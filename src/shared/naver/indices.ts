import { StockPrice, MarqueeItem } from '@/shared/types';
import { logger } from '@/shared/utils/logger';
import { BASE, fetchJSON, num, parseDir } from './client';
import { parsePollingData } from './polling';
import type { NaverPollingResponse, NaverIndexPollingRaw } from './types';

/** 국내 지수/선물 — KOSPI, KPI100, KOSDAQ, FUT 등 */
export const fetchDomesticIndex = async (code: string): Promise<StockPrice | null> => {
  try {
    const resp = await fetchJSON<NaverPollingResponse>(
      `${BASE}/polling/domestic/index?itemCodes=${encodeURIComponent(code)}`
    );
    const d = resp.datas?.[0];
    if (!d) return null;
    const cat = code.toUpperCase() === 'FUT' ? 'futures' : 'index';
    return parsePollingData(d, code, cat);
  } catch (e) {
    logger.error('국내지수/선물 조회 실패', `${code}: ${(e as Error).message}`);
    return null;
  }
};

/** 해외 지수 — .IXIC, .DJI, .NDX 등 */
export const fetchOverseasIndex = async (code: string): Promise<StockPrice | null> => {
  try {
    const resp = await fetchJSON<NaverPollingResponse>(
      `${BASE}/polling/worldstock/index?reutersCodes=${encodeURIComponent(code)}`
    );
    const d = resp.datas?.[0];
    if (!d) return null;
    return parsePollingData(d, code, 'index');
  } catch (e) {
    logger.error('해외지수 조회 실패', `${code}: ${(e as Error).message}`);
    return null;
  }
};

/** 해외 선물 — NQcv1, ESv1 등 */
export const fetchOverseasFutures = async (code: string): Promise<StockPrice | null> => {
  try {
    const resp = await fetchJSON<NaverPollingResponse>(
      `${BASE}/polling/worldstock/futures?reutersCodes=${encodeURIComponent(code)}`
    );
    const d = resp.datas?.[0];
    if (!d) return null;
    return parsePollingData(d, code, 'futures');
  } catch (e) {
    logger.error('해외선물 조회 실패', `${code}: ${(e as Error).message}`);
    return null;
  }
};

export const fetchDomesticIndices = async (): Promise<MarqueeItem[]> => {
  try {
    const data = await fetchJSON<NaverIndexPollingRaw>(`${BASE}/polling/domestic/index?itemCodes=KOSPI%2CKOSDAQ%2CKPI200`);
    return (data.datas || []).map(d => {
      const dir = d.compareToPreviousPrice?.code === '2' ? 1 : d.compareToPreviousPrice?.code === '5' ? -1 : 0;
      const c = num(d.compareToPreviousClosePriceRaw);
      const p = num(d.fluctuationsRatioRaw);
      return {
        code: d.itemCode ?? '', name: d.stockName || d.itemCode || '',
        currentValue: num(d.closePriceRaw),
        change: dir >= 0 ? c : -c, changePercent: dir >= 0 ? p : -p,
        changeDirection: parseDir(dir), type: 'index' as const,
      };
    });
  } catch (e) { logger.error('국내지수', (e as Error).message); return []; }
};

export const fetchWorldIndices = async (): Promise<MarqueeItem[]> => {
  try {
    const data = await fetchJSON<NaverIndexPollingRaw>(`${BASE}/polling/worldstock/index?reutersCodes=.DJI%2C.INX%2C.IXIC%2C.N225%2C.HSI%2C.FTSE%2C.GDAXI`);
    return (data.datas || []).map(d => {
      const dir = d.compareToPreviousPrice?.code === '2' ? 1 : d.compareToPreviousPrice?.code === '5' ? -1 : 0;
      const c = num(d.compareToPreviousClosePriceRaw);
      const p = num(d.fluctuationsRatioRaw);
      return {
        code: d.reutersCode || d.symbolCode || '', name: d.indexName || d.reutersCode || '',
        currentValue: num(d.closePriceRaw),
        change: dir >= 0 ? c : -c, changePercent: dir >= 0 ? p : -p,
        changeDirection: parseDir(dir), type: 'index' as const,
      };
    });
  } catch (e) { logger.error('세계지수', (e as Error).message); return []; }
};
