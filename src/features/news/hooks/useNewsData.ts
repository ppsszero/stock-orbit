import { useState, useCallback, useEffect, useRef } from 'react';
import {
  fetchMarketBriefing, fetchMainNews, fetchMoneyStory,
  MarketBriefing, NewsArticle, MoneyStory,
} from '@/shared/naver';
import { cached } from '@/shared/utils/cache';

const PAGE_STEP = 10;
const MAX_SIZE = 50;
const CACHE_TTL = 10 * 60 * 1000;
/** 수동 새로고침 시에만 스피너 최소 표시 시간 — 캐시 히트 시에는 즉시 반환 */
const MIN_SPIN_MS = 400;

export const useNewsData = (open: boolean) => {
  const [briefing, setBriefing] = useState<MarketBriefing | null>(null);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [stories, setStories] = useState<MoneyStory[]>([]);
  const [loading, setLoading] = useState(false);

  const newsSize = useRef(PAGE_STEP);
  const storySize = useRef(PAGE_STEP);
  const fetching = useRef(false);

  const load = useCallback(async (forceRefresh = false): Promise<boolean> => {
    setLoading(true);
    newsSize.current = PAGE_STEP;
    storySize.current = PAGE_STEP;
    const started = Date.now();
    const [b, n, s] = await Promise.all([
      cached('news-briefing', fetchMarketBriefing, CACHE_TTL, forceRefresh),
      cached('news-main', () => fetchMainNews(PAGE_STEP), CACHE_TTL, forceRefresh),
      cached('news-story', () => fetchMoneyStory(PAGE_STEP), CACHE_TTL, forceRefresh),
    ]);
    // 수동 새로고침(forceRefresh)일 때만 스피너 최소 표시
    if (forceRefresh) {
      const elapsed = Date.now() - started;
      if (elapsed < MIN_SPIN_MS) await new Promise(r => setTimeout(r, MIN_SPIN_MS - elapsed));
    }
    setBriefing(b);
    setNews(n);
    setStories(s);
    setLoading(false);
    return !!(b || n.length > 0 || s.length > 0);
  }, []);

  const loadMoreNews = useCallback(async () => {
    if (fetching.current || newsSize.current >= MAX_SIZE) return;
    fetching.current = true;
    newsSize.current = Math.min(newsSize.current + PAGE_STEP, MAX_SIZE);
    const n = await fetchMainNews(newsSize.current);
    setNews(n);
    fetching.current = false;
  }, []);

  const loadMoreStories = useCallback(async () => {
    if (fetching.current || storySize.current >= MAX_SIZE) return;
    fetching.current = true;
    storySize.current = Math.min(storySize.current + PAGE_STEP, MAX_SIZE);
    const s = await fetchMoneyStory(storySize.current);
    setStories(s);
    fetching.current = false;
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  return {
    briefing, news, stories, loading, refresh: load,
    loadMoreNews, loadMoreStories,
    newsMaxed: news.length > 0 && newsSize.current >= MAX_SIZE,
    storiesMaxed: stories.length > 0 && storySize.current >= MAX_SIZE,
  };
};
