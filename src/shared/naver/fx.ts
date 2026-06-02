import { MarqueeItem } from '@/shared/types';
import { logger } from '@/shared/utils/logger';
import { fetchJSON, num, parseDir } from './client';
import type { NaverFXRaw } from './types';

const FX_API = 'https://api.stock.naver.com/marketindex/exchange';
const FX_CODES = ['FX_USDKRW', 'FX_JPYKRW', 'FX_EURKRW', 'FX_CNYKRW'];
const FX_NAMES: Record<string, string> = { FX_USDKRW: 'USD/KRW', FX_JPYKRW: 'JPY/KRW', FX_EURKRW: 'EUR/KRW', FX_CNYKRW: 'CNY/KRW' };

export const fetchFXRates = async (): Promise<MarqueeItem[]> => {
  const results: MarqueeItem[] = [];
  for (const code of FX_CODES) {
    try {
      const d = await fetchJSON<NaverFXRaw>(`${FX_API}/${code}`);
      const info = d.exchangeInfo || d;
      const c = num(info.fluctuations);
      const p = num(info.fluctuationsRatio);
      const dir = info.fluctuationsType?.code === '2' ? 1 : info.fluctuationsType?.code === '5' ? -1 : 0;
      results.push({
        code, name: FX_NAMES[code] || info.name || code,
        currentValue: num(info.calcPrice) || num(info.closePrice),
        change: dir >= 0 ? c : -c,
        changePercent: dir >= 0 ? p : -p,
        changeDirection: parseDir(dir), type: 'fx',
      });
    } catch (e) { logger.warn(`환율 ${code}`, (e as Error).message); }
  }
  logger.info('환율', `${results.length}건 조회 (USD/KRW: ${results[0]?.currentValue || 'N/A'})`);
  return results;
};
