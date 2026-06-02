import { logger } from '@/shared/utils/logger';
import { BASE, fetchJSON } from './client';
import type { InterestRateRaw } from './types';

export interface InterestRateItem {
  name: string;
  code?: string;
  rate: string;
  change: string;
  changeRatio: string;
  direction: 'up' | 'down' | 'flat';
  date: string;
  nextReleaseDate?: string;
  nation?: string;
  nationName?: string;
  description?: string;
}

export const parseInterestRate = (d: InterestRateRaw): InterestRateItem => {
  const dirCode = d.fluctuationsType?.code;
  const dir = dirCode === '2' || dirCode === '1' ? 'up' : dirCode === '5' || dirCode === '4' ? 'down' : 'flat';
  const dateStr = d.localTradedAt ? d.localTradedAt.split('T')[0] : '';
  return {
    name: d.name || '',
    code: d.itemCode || d.code || d.reutersCode || d.symbolCode || undefined,
    rate: d.closePrice || '0',
    change: d.fluctuations || '0',
    changeRatio: d.fluctuationsRatio || '-',
    direction: dir,
    date: dateStr,
    nextReleaseDate: d.nextReleaseKoreaDate || undefined,
    nation: d.nationType || undefined,
    nationName: d.nationName || undefined,
    description: d.description || undefined,
  };
};

export const fetchStandardInterest = async (): Promise<InterestRateItem[]> => {
  try {
    const data = await fetchJSON<InterestRateRaw[]>(`${BASE}/securityService/marketindex/majors/standardInterest`);
    return (data || []).map(parseInterestRate);
  } catch (e) {
    logger.error('기준금리', (e as Error).message);
    return [];
  }
};

export const fetchDomesticInterest = async (): Promise<InterestRateItem[]> => {
  try {
    const data = await fetchJSON<InterestRateRaw[]>(`${BASE}/securityService/marketindex/majors/domesticInterest`);
    return (data || []).map(parseInterestRate);
  } catch (e) {
    logger.error('국내금리', (e as Error).message);
    return [];
  }
};

export const fetchBondYield = async (): Promise<InterestRateItem[]> => {
  try {
    const data = await fetchJSON<InterestRateRaw[]>(`${BASE}/securityService/marketindex/majors/bond`);
    return (data || []).map(parseInterestRate);
  } catch (e) {
    logger.error('국채수익률', (e as Error).message);
    return [];
  }
};
