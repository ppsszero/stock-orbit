import { logger } from '@/shared/utils/logger';
import { BASE, fetchJSON } from './client';
import type { NaverEconomicCalendarRaw, NaverEconomicIndicatorRaw } from './types';

export interface EconomicIndicator {
  name: string;
  nation: 'KR' | 'US' | string;
  nationName: string;
  releaseDate: string;
  releaseTime: string;
  isReleased: boolean;
  actualValue: number;
  previousValue: number;
  changeValue: number;
  importance: number;
  unit: string;
  period: string;
}

const NATION_CODE_MAP: Record<string, string> = { KOR: 'KR', USA: 'US' };

/** HHmmss → HH:mm */
const fmtTime = (raw: string): string => {
  if (!raw) return '';
  const s = raw.replace(/[^0-9]/g, '');
  if (s.length >= 4) return `${s.slice(0, 2)}:${s.slice(2, 4)}`;
  return raw;
};

export const parseIndicator = (d: NaverEconomicIndicatorRaw): EconomicIndicator => ({
  name: d.name || '',
  nation: NATION_CODE_MAP[d.nationType || ''] || d.nationType || '',
  nationName: d.nationKoreanName || '',
  releaseDate: d.releaseDate || '',
  releaseTime: fmtTime(d.releaseTime || ''),
  isReleased: d.isRelease === true,
  actualValue: d.actualValue ?? 0,
  previousValue: d.previousValue ?? 0,
  changeValue: d.changeValue ?? 0,
  importance: d.importance ?? 1,
  unit: d.indicatorUnit || '',
  period: d.period || '',
});

export const fetchEconomicCalendar = async (date: string): Promise<EconomicIndicator[]> => {
  try {
    const raw = await fetchJSON<NaverEconomicCalendarRaw>(
      `${BASE}/securityService/economic/indicator/nations/releaseDate?nationTypeList=KOR&nationTypeList=USA&page=1&pageSize=100&releaseDate=${date}`
    );
    const items = (raw.indicators || []).map(parseIndicator);
    logger.info('경제캘린더', `${date} → ${items.length}건`);
    return items;
  } catch (e) {
    logger.error('경제캘린더', (e as Error).message);
    return [];
  }
};
