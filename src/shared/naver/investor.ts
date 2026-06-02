import { logger } from '@/shared/utils/logger';
import { parseSignDirection, type Direction } from '@/shared/utils/format';
import { BASE, fetchJSON, num } from './client';
import type { NaverInvestorDataRaw } from './types';

export interface SignedValue {
  value: string;
  direction: Direction;
}
export interface InvestorData {
  dealTrend: { personal: SignedValue; foreign: SignedValue; institutional: SignedValue };
  programTrend: { arbitrage: SignedValue; nonArbitrage: SignedValue; total: SignedValue };
  upDown: { rise: number; steady: number; fall: number; upper: number; lower: number };
}

export const toSigned = (raw: string | undefined): SignedValue => {
  const value = raw || '0';
  return { value, direction: parseSignDirection(value) };
};

export const fetchInvestorData = async (market: 'KOSPI' | 'KOSDAQ'): Promise<InvestorData | null> => {
  try {
    const d = await fetchJSON<NaverInvestorDataRaw>(`${BASE}/securityFe/api/index/${market}/integration`);
    const deal = d.dealTrendInfo || {};
    const prog = d.programTrendInfo || {};
    const ud = d.upDownStockInfo || {};
    return {
      dealTrend: {
        personal: toSigned(deal.personalValue),
        foreign: toSigned(deal.foreignValue),
        institutional: toSigned(deal.institutionalValue),
      },
      programTrend: {
        arbitrage: toSigned(prog.indexDifferenceReal),
        nonArbitrage: toSigned(prog.indexBiDifferenceReal),
        total: toSigned(prog.indexTotalReal),
      },
      upDown: {
        // 네이버가 "1,402" 콤마 포함 — num()으로 안전 파싱
        rise: num(ud.riseCount),
        steady: num(ud.steadyCount),
        fall: num(ud.fallCount),
        upper: num(ud.upperCount),
        lower: num(ud.lowerCount),
      },
    };
  } catch (e) {
    logger.error('투자정보', `${market}: ${(e as Error).message}`);
    return null;
  }
};
