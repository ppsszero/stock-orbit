import { useState, useCallback, useEffect, useRef } from 'react';
import {
  fetchMarketBriefing, fetchMoneyStory,
  fetchNewsByCategory, fetchResearchByCategory,
  MarketBriefing, NewsArticle, MoneyStory,
  NewsCategory, ResearchCategory, ResearchItem,
} from '@/shared/naver';
import { cached } from '@/shared/utils/cache';
import { withMinSpin } from '@/shared/utils/withMinSpin';

const PAGE_SIZE = 50;
const CACHE_TTL = 10 * 60 * 1000;

/**
 * 뉴스 시트 데이터 매니저.
 * - briefing/stories: 시트 열림 시 즉시 fetch (브리핑 탭 + 머니스토리 탭의 메인 데이터)
 * - 첫 카테고리(flashnews, daily): 시트 열림 시 함께 fetch — 탭 진입 시 빈 화면 회피
 * - 그 외 카테고리: ensureNews/ensureResearch로 lazy fetch (활성 탭에서 trigger)
 * - 캐시는 cached util — 같은 시트 재오픈 시 즉시 표시
 */
export const useNewsData = (open: boolean) => {
  const [briefing, setBriefing] = useState<MarketBriefing | null>(null);
  const [stories, setStories] = useState<MoneyStory[]>([]);
  const [newsByCat, setNewsByCat] = useState<Partial<Record<NewsCategory, NewsArticle[]>>>({});
  const [researchByCat, setResearchByCat] = useState<Partial<Record<ResearchCategory, ResearchItem[]>>>({});
  const [loading, setLoading] = useState(false);

  // lazy ensure 안에서 최신 값 참조 — useCallback deps 회피
  const newsByCatRef = useRef(newsByCat);
  const researchByCatRef = useRef(researchByCat);
  newsByCatRef.current = newsByCat;
  researchByCatRef.current = researchByCat;

  const loadInitial = useCallback(async (forceRefresh = false): Promise<boolean> => {
    setLoading(true);
    const fetchAll = () => Promise.all([
      cached('news-briefing', fetchMarketBriefing, CACHE_TTL, forceRefresh),
      cached('news-story', () => fetchMoneyStory(PAGE_SIZE), CACHE_TTL, forceRefresh),
      cached('news-cat-flashnews', () => fetchNewsByCategory('flashnews', PAGE_SIZE), CACHE_TTL, forceRefresh),
      cached('research-cat-daily', () => fetchResearchByCategory('daily', PAGE_SIZE), CACHE_TTL, forceRefresh),
    ]);
    const [b, s, flash, daily] = forceRefresh ? await withMinSpin(fetchAll) : await fetchAll();
    setBriefing(b);
    setStories(s);
    setNewsByCat({ flashnews: flash });
    setResearchByCat({ daily });
    setLoading(false);
    return !!(b || s.length > 0 || flash.length > 0 || daily.length > 0);
  }, []);

  // 빈 배열은 가드 통과하도록 — fetch 실패(timeout/network)로 빈 결과면 다음 탭 진입 시 재시도
  const ensureNews = useCallback(async (cat: NewsCategory) => {
    const existing = newsByCatRef.current[cat];
    if (existing && existing.length > 0) return;
    const data = await fetchNewsByCategory(cat, PAGE_SIZE);
    setNewsByCat(prev => ({ ...prev, [cat]: data }));
  }, []);

  const ensureResearch = useCallback(async (cat: ResearchCategory) => {
    const existing = researchByCatRef.current[cat];
    if (existing && existing.length > 0) return;
    const data = await fetchResearchByCategory(cat, PAGE_SIZE);
    setResearchByCat(prev => ({ ...prev, [cat]: data }));
  }, []);

  // 활성 탭 단위 강제 새로고침 — 새로고침 버튼은 사용자가 *보고 있는* 데이터만 갱신
  const refreshBriefing = useCallback(async () => {
    const b = await fetchMarketBriefing();
    setBriefing(b);
    return !!b;
  }, []);
  const refreshStories = useCallback(async () => {
    const s = await fetchMoneyStory(PAGE_SIZE);
    setStories(s);
    return s.length > 0;
  }, []);
  const refreshNews = useCallback(async (cat: NewsCategory) => {
    const data = await fetchNewsByCategory(cat, PAGE_SIZE);
    setNewsByCat(prev => ({ ...prev, [cat]: data }));
    return data.length > 0;
  }, []);
  const refreshResearch = useCallback(async (cat: ResearchCategory) => {
    const data = await fetchResearchByCategory(cat, PAGE_SIZE);
    setResearchByCat(prev => ({ ...prev, [cat]: data }));
    return data.length > 0;
  }, []);

  useEffect(() => {
    if (open) loadInitial();
  }, [open, loadInitial]);

  return {
    briefing, stories, newsByCat, researchByCat,
    loading,
    ensureNews, ensureResearch,
    refreshBriefing, refreshStories, refreshNews, refreshResearch,
  };
};
