import { useState, useCallback, useEffect, useRef } from 'react';
import {
  fetchMarketBriefing, fetchMoneyStory,
  fetchNewsByCategory, fetchResearchByCategory,
  MarketBriefing, NewsArticle, MoneyStory,
  NewsCategory, ResearchCategory, ResearchItem,
} from '@/shared/naver';
import { cachedWithStatus, invalidateByPrefix } from '@/shared/utils/cache';
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
  // 실제로 fetch가 일어난 마지막 시각. cache 히트만 발생한 reopen에선 갱신 X →
  // SheetLayout 새로고침 버튼 툴팁의 "X분 전 갱신" 표시를 자동 갱신과 동기화.
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  // 시트가 열려있는지 — fetch 응답 도착 시 닫혀있으면 setState 스킵 (unmount/stale 방지)
  const activeRef = useRef(open);
  activeRef.current = open;

  const loadInitial = useCallback(async (forceRefresh = false): Promise<boolean> => {
    setLoading(true);
    const fetchAll = () => Promise.all([
      cachedWithStatus('news-briefing', fetchMarketBriefing, CACHE_TTL, forceRefresh),
      cachedWithStatus('news-story', () => fetchMoneyStory(PAGE_SIZE), CACHE_TTL, forceRefresh),
      cachedWithStatus('news-cat-flashnews', () => fetchNewsByCategory('flashnews', PAGE_SIZE), CACHE_TTL, forceRefresh),
      cachedWithStatus('research-cat-daily', () => fetchResearchByCategory('daily', PAGE_SIZE), CACHE_TTL, forceRefresh),
    ]);
    const [b, s, flash, daily] = forceRefresh ? await withMinSpin(fetchAll) : await fetchAll();
    if (!activeRef.current) { setLoading(false); return false; }
    setBriefing(b.data);
    setStories(s.data);
    // merge 패턴 — 객체 통째 교체 X. 시트 재오픈 시 lazy 로드된 sub-tab(ranknews 등)이 wiped되어
    // `<LoadingCenter />`가 안 꺼지는 사고 방지. refreshAll에선 명시적으로 빈 객체로 reset 후 호출.
    setNewsByCat(prev => ({ ...prev, flashnews: flash.data }));
    setResearchByCat(prev => ({ ...prev, daily: daily.data }));
    // 4개 중 하나라도 fresh fetch였으면 timestamp 갱신 (자동 새로고침과 툴팁 동기화)
    const anyFresh = !b.fromCache || !s.fromCache || !flash.fromCache || !daily.fromCache;
    if (anyFresh) setLastUpdatedAt(new Date());
    setLoading(false);
    return !!(b.data || s.data.length > 0 || flash.data.length > 0 || daily.data.length > 0);
  }, []);

  // cachedWithStatus를 경유 — TTL 만료된 lazy 로드 sub-tab도 자동 재fetch.
  // 캐시 valid 동안엔 즉시 반환 → setState 같은 데이터로 호출돼도 React 리컨실로 visible re-render 없음.
  // fresh fetch가 발생했을 때만 lastUpdatedAt 갱신 (자동 새로고침 timestamp 일관성).
  const ensureNews = useCallback(async (cat: NewsCategory) => {
    const { data, fromCache } = await cachedWithStatus(
      `news-cat-${cat}`,
      () => fetchNewsByCategory(cat, PAGE_SIZE),
      CACHE_TTL,
    );
    if (!activeRef.current) return; // 응답 도착 시 시트 닫혀있으면 stale, 스킵
    setNewsByCat(prev => ({ ...prev, [cat]: data }));
    if (!fromCache) setLastUpdatedAt(new Date());
  }, []);

  const ensureResearch = useCallback(async (cat: ResearchCategory) => {
    const { data, fromCache } = await cachedWithStatus(
      `research-cat-${cat}`,
      () => fetchResearchByCategory(cat, PAGE_SIZE),
      CACHE_TTL,
    );
    if (!activeRef.current) return;
    setResearchByCat(prev => ({ ...prev, [cat]: data }));
    if (!fromCache) setLastUpdatedAt(new Date());
  }, []);

  // 시트 단위 통합 새로고침 — briefing/stories/첫 서브탭 force fetch + 나머지 카테고리 캐시 invalidate
  // → 사용자가 다른 탭 들어가면 ensureXXX(cachedWithStatus)가 cache miss → 자동 fresh fetch
  const refreshAll = useCallback(async (): Promise<boolean> => {
    // lazy 로드된 sub-tab의 캐시 전부 무효화 (안 하면 ensureXXX가 stale 캐시 hit해서 옛 데이터 반환)
    invalidateByPrefix('news-cat-');
    invalidateByPrefix('research-cat-');
    setNewsByCat({});
    setResearchByCat({});
    return await loadInitial(true);
  }, [loadInitial]);

  useEffect(() => {
    if (open) loadInitial();
  }, [open, loadInitial]);

  return {
    briefing, stories, newsByCat, researchByCat,
    loading,
    ensureNews, ensureResearch,
    refresh: refreshAll,
    lastUpdatedAt,
  };
};
