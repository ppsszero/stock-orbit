import { useState, useCallback, useEffect, useRef } from 'react';
import {
  fetchMarketBriefing, fetchMainNews, fetchMoneyStory,
  MarketBriefing, NewsArticle, MoneyStory,
} from '@/shared/naver';

const PAGE_STEP = 10;
const MAX_SIZE = 50;

export const useNewsData = (open: boolean) => {
  const [briefing, setBriefing] = useState<MarketBriefing | null>(null);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [stories, setStories] = useState<MoneyStory[]>([]);
  const [loading, setLoading] = useState(false);

  const newsSize = useRef(PAGE_STEP);
  const storySize = useRef(PAGE_STEP);
  const fetching = useRef(false);

  const load = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    newsSize.current = PAGE_STEP;
    storySize.current = PAGE_STEP;
    // 스피너 최소 표시 시간 — 너무 빠른 응답 시 피드백 누락 방지
    const MIN_SPIN_MS = 400;
    const started = Date.now();
    const [b, n, s] = await Promise.all([
      fetchMarketBriefing(),
      fetchMainNews(PAGE_STEP),
      fetchMoneyStory(PAGE_STEP),
    ]);
    const elapsed = Date.now() - started;
    if (elapsed < MIN_SPIN_MS) {
      await new Promise(r => setTimeout(r, MIN_SPIN_MS - elapsed));
    }
    setBriefing(b);
    setNews(n);
    setStories(s);
    setLoading(false);
    // 셋 중 하나라도 들어오면 성공으로 간주
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
