import { logger } from '@/shared/utils/logger';
import { BASE, MOBILE_BASE, fetchJSON } from './client';
import type {
  NaverMarketBriefingRaw,
  NaverMoneyStoryRaw,
  NewsCategoryResponseRaw,
} from './types';

export interface MarketBriefing {
  title: string;
  summary: string;
  detail: string;
  briefingDate: string;
  briefingHour: string;
  articles: { title: string; officeName: string; officeId: string; articleId: string }[];
}

export interface NewsRelatedItem {
  reutersCode: string;
  itemName: string;
  fluctuationsRatio: string;
  endUrl: string;
}

export interface NewsArticle {
  title: string;
  datetime: string;
  subcontent: string;
  thumbUrl?: string;
  officeId: string;
  articleId: string;
  officeHname: string;
  url: string;
  relatedItems?: NewsRelatedItem[];
}

export interface MoneyStory {
  id: number;
  title: string;
  imageUrl: string;
  aiSummary: string;
  teaser: string;
  displayAt: string;
  viewCount: number;
  categoryName: string;
  channelName: string;
  channelId: number;
  mainCategoryId: number;
}

export type NewsCategory = 'flashnews' | 'mainnews' | 'ranknews' | 'worldnews';

export const fetchMarketBriefing = async (): Promise<MarketBriefing | null> => {
  try {
    const d = await fetchJSON<NaverMarketBriefingRaw>(`${BASE}/securityAi/marketBriefing/current?marketBriefing=domain`);
    if (!d?.enabled) return null;
    return {
      title: d.title || '', summary: d.summary || '', detail: d.detail || '',
      briefingDate: d.briefingDate || '', briefingHour: d.briefingHour || '',
      articles: (d.articles || []).map(a => ({
        title: a.title ?? '', officeName: a.officeName ?? '', officeId: a.officeId ?? '', articleId: a.articleId ?? '',
      })),
    };
  } catch (e) { logger.error('AI 브리핑', (e as Error).message); return null; }
};

/** YYYYMMDDHHMMSS → ISO local (formatTime이 new Date()로 파싱 가능하도록) */
export const parseNewsDatetime = (dt?: string): string => {
  if (!dt || dt.length < 14) return dt || '';
  return `${dt.slice(0,4)}-${dt.slice(4,6)}-${dt.slice(6,8)}T${dt.slice(8,10)}:${dt.slice(10,12)}:${dt.slice(12,14)}`;
};

/** 카테고리별 기사 상세 URL (해외뉴스는 별도 패턴) */
const buildNewsArticleUrl = (cat: NewsCategory, officeId: string, articleId: string): string => {
  if (cat === 'worldnews') {
    return `${MOBILE_BASE}/investment/news/worldnews/${officeId}/${articleId}`;
  }
  return `https://n.news.naver.com/article/${officeId}/${articleId}`;
};

export const fetchNewsByCategory = async (category: NewsCategory, pageSize: number = 50): Promise<NewsArticle[]> => {
  const path = category === 'worldnews'
    ? `${MOBILE_BASE}/front-api/news/worldnews?pageSize=${pageSize}&page=1`
    : `${MOBILE_BASE}/front-api/news/category?category=${category}&pageSize=${pageSize}&page=1`;
  try {
    const d = await fetchJSON<NewsCategoryResponseRaw>(path);
    return (d.result || []).map(a => {
      const officeId = a.officeId ?? '';
      const articleId = a.articleId ?? '';
      return {
        title: a.title ?? a.titleFull ?? '',
        datetime: parseNewsDatetime(a.datetime),
        subcontent: a.body ?? '',
        thumbUrl: a.hasImage === true && a.imageOriginLink ? a.imageOriginLink : undefined,
        officeId,
        articleId,
        officeHname: a.officeName ?? '',
        url: buildNewsArticleUrl(category, officeId, articleId),
        relatedItems: a.relatedItems && a.relatedItems.length > 0
          ? a.relatedItems.map(r => ({
              reutersCode: r.reutersCode ?? '',
              itemName: r.itemName ?? '',
              fluctuationsRatio: r.fluctuationsRatio ?? '0',
              endUrl: r.endUrl ?? '',
            }))
          : undefined,
      };
    });
  } catch (e) { logger.error(`뉴스 ${category}`, (e as Error).message); return []; }
};

export const fetchMoneyStory = async (size: number = 50): Promise<MoneyStory[]> => {
  try {
    const d = await fetchJSON<NaverMoneyStoryRaw>(`${BASE}/content/moneyStory?mainCategoryIdList=1&size=${size}`);
    return (d.moneyContentList || []).map(m => ({
      id: m.id ?? 0, title: m.title ?? '', imageUrl: m.imageUrl ?? '',
      aiSummary: m.aiSummary || '', teaser: (m.teaser || '').replace(/<[^>]+>/g, ''),
      displayAt: m.displayAt ?? '', viewCount: m.viewCount ?? 0,
      categoryName: m.category?.subName || m.category?.mainName || '',
      channelName: m.channel?.name || '',
      channelId: m.channel?.id ?? 0,
      mainCategoryId: m.category?.mainId ?? 1,
    }));
  } catch (e) { logger.error('머니스토리', (e as Error).message); return []; }
};
