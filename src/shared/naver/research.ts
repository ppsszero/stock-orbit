import { logger } from '@/shared/utils/logger';
import { MOBILE_BASE, fetchJSON } from './client';
import type { ResearchResponseRaw } from './types';

export type ResearchCategory = 'daily' | 'company' | 'industry' | 'invest' | 'economy' | 'debenture';

export interface ResearchItem {
  researchId: number;
  category: string;
  title: string;
  brokerName: string;
  writeDate: string;
  readCount: string;
  endUrl: string;
  itemCode?: string;
  itemName?: string;
}

export const fetchResearchByCategory = async (category: ResearchCategory, pageSize: number = 50): Promise<ResearchItem[]> => {
  try {
    const d = await fetchJSON<ResearchResponseRaw>(
      `${MOBILE_BASE}/front-api/research/list?category=${category}&pageSize=${pageSize}&page=1`
    );
    return (d.result || []).map(r => ({
      researchId: r.researchId ?? 0,
      category: r.researchCategory || r.category || '',
      title: r.title ?? '',
      brokerName: r.brokerName ?? '',
      writeDate: r.writeDate ?? '',
      readCount: r.readCount ?? '0',
      endUrl: r.endUrl ?? '',
      itemCode: r.itemCode,
      itemName: r.itemName,
    }));
  } catch (e) { logger.error(`리서치 ${category}`, (e as Error).message); return []; }
};
