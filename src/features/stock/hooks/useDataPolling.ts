import { useRef, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { StockPrice, StockSymbol, MarqueeItem, inferCategory } from '@/shared/types';
import {
  fetchDomesticStocksBatch,
  fetchOverseasStocksBatch,
  fetchDomesticIndex,
  fetchOverseasIndex,
  fetchOverseasFutures,
  fetchDomesticIndices,
  fetchWorldIndices,
  fetchCommodities,
  fetchFXRates,
} from '@/shared/naver';

/** 한 배치당 요청할 종목 수 */
const BATCH_SIZE = 10;
/** 배치 사이의 지연 (ms) */
const BATCH_DELAY_MS = 1_500;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── 종목 분류 ──

interface ClassifiedSymbols {
  domesticStocks: StockSymbol[];
  overseasStocks: StockSymbol[];
  domesticIndexFutures: StockSymbol[];
  overseasIndexFutures: StockSymbol[];
}

const classifySymbols = (symbols: StockSymbol[]): ClassifiedSymbols => {
  const domesticStocks: StockSymbol[] = [];
  const overseasStocks: StockSymbol[] = [];
  const domesticIndexFutures: StockSymbol[] = [];
  const overseasIndexFutures: StockSymbol[] = [];

  for (const sym of symbols) {
    const cat = inferCategory(sym);
    if (cat === 'index' || cat === 'futures') {
      const c = sym.code.toUpperCase();
      const rc = (sym.reutersCode || '').toUpperCase();
      const isOverseas = c.startsWith('.') || rc.startsWith('.') || /CV\d+$/i.test(c) || /CV\d+$/i.test(rc);
      if (isOverseas) overseasIndexFutures.push(sym);
      else domesticIndexFutures.push(sym);
    } else if (sym.nation === 'KR') {
      domesticStocks.push(sym);
    } else {
      overseasStocks.push(sym);
    }
  }
  return { domesticStocks, overseasStocks, domesticIndexFutures, overseasIndexFutures };
};

// ── 지수/선물 개별 fetch ──

const fetchOneIndexFutures = (sym: StockSymbol): Promise<StockPrice | null> => {
  const c = sym.code.toUpperCase();
  const rc = (sym.reutersCode || '').toUpperCase();
  const cat = inferCategory(sym);

  if (cat === 'index') {
    if (c.startsWith('.') || rc.startsWith('.')) return fetchOverseasIndex(sym.reutersCode || sym.code);
    return fetchDomesticIndex(sym.code);
  }
  if (/CV\d+$/i.test(c) || /CV\d+$/i.test(rc)) return fetchOverseasFutures(sym.reutersCode || sym.code);
  return fetchDomesticIndex(sym.code);
};

// ── 국내 사이클 ──

const fetchDomesticCycle = async (
  classified: ClassifiedSymbols,
  onProgress?: (ratio: number) => void,
): Promise<{ prices: Record<string, StockPrice>; marqueeItems: MarqueeItem[] }> => {
  const prices: Record<string, StockPrice> = {};
  const marqueeItems: MarqueeItem[] = [];

  const { domesticStocks, domesticIndexFutures } = classified;
  const batches = Math.ceil(domesticStocks.length / BATCH_SIZE);
  const totalSteps = batches + 1 + 1; // stocks + user indices + marquee indices
  let done = 0;
  const report = () => { done++; onProgress?.(totalSteps > 0 ? done / totalSteps : 1); };

  // 1. 국내 주식 배치
  for (let i = 0; i < domesticStocks.length; i += BATCH_SIZE) {
    const batch = domesticStocks.slice(i, i + BATCH_SIZE);
    const result = await fetchDomesticStocksBatch(batch.map(s => s.code));
    Object.assign(prices, result);
    report();
    if (i + BATCH_SIZE < domesticStocks.length) await sleep(BATCH_DELAY_MS);
  }
  if (domesticStocks.length === 0) report();

  // 2. 유저 국내 지수/선물 (개별 호출 — 배치 미지원)
  if (domesticIndexFutures.length > 0) {
    const results = await Promise.allSettled(domesticIndexFutures.map(fetchOneIndexFutures));
    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value) prices[domesticIndexFutures[i].code] = r.value;
    });
  }
  report();

  // 3. 마퀴 국내 지수 (KOSPI, KOSDAQ, KPI200) — 항상 호출
  const domesticMarquee = await fetchDomesticIndices();
  marqueeItems.push(...domesticMarquee);
  report();

  return { prices, marqueeItems };
};

// ── 해외 사이클 ──

const fetchOverseasCycle = async (
  classified: ClassifiedSymbols,
): Promise<{ prices: Record<string, StockPrice>; marqueeItems: MarqueeItem[] }> => {
  const prices: Record<string, StockPrice> = {};
  const marqueeItems: MarqueeItem[] = [];

  const { overseasStocks, overseasIndexFutures } = classified;

  // 1. 해외 주식 배치
  for (let i = 0; i < overseasStocks.length; i += BATCH_SIZE) {
    const batch = overseasStocks.slice(i, i + BATCH_SIZE);
    const reutersCodes = batch.map(s => s.reutersCode || s.code);
    const result = await fetchOverseasStocksBatch(reutersCodes);
    for (const sym of batch) {
      const key = sym.code;
      const rc = sym.reutersCode || sym.code;
      const symbolCode = rc.split('.')[0];
      const price = result[symbolCode] || result[key] || result[rc];
      if (price) prices[key] = price;
    }
    if (i + BATCH_SIZE < overseasStocks.length) await sleep(BATCH_DELAY_MS);
  }

  // 2. 유저 해외 지수/선물
  if (overseasIndexFutures.length > 0) {
    const results = await Promise.allSettled(overseasIndexFutures.map(fetchOneIndexFutures));
    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value) prices[overseasIndexFutures[i].code] = r.value;
    });
  }

  // 3. 마퀴 데이터 (해외 지수 + 원자재 + 환율) — 항상 호출
  const [worldIndices, commodities, fx] = await Promise.allSettled([
    fetchWorldIndices(),
    fetchCommodities(),
    fetchFXRates(),
  ]);
  if (worldIndices.status === 'fulfilled') marqueeItems.push(...worldIndices.value);
  if (commodities.status === 'fulfilled') marqueeItems.push(...commodities.value);
  if (fx.status === 'fulfilled') marqueeItems.push(...fx.value);

  return { prices, marqueeItems };
};

// ── 통합 훅 ──

interface DataPollingResult {
  prices: Record<string, StockPrice>;
  marqueeItems: MarqueeItem[];
  loading: boolean;
  fetching: boolean;
  lastUpdated: Date | null;
  refresh: () => void;
  progressRef: React.MutableRefObject<number>;
  subscribeProgress: (fn: () => void) => () => void;
}

export const useDataPolling = (
  symbols: StockSymbol[],
  refreshIntervalDomestic: number,
  refreshIntervalOverseas: number,
): DataPollingResult => {
  // progress (ref 기반 — 리렌더 방지)
  const progressRef = useRef(0);
  const listenersRef = useRef<Set<() => void>>(new Set());
  const setProgress = useCallback((v: number) => {
    progressRef.current = v;
    listenersRef.current.forEach(fn => fn());
  }, []);
  useEffect(() => () => { listenersRef.current.clear(); }, []);

  // 종목 분류 — useMemo로 안전하게 (렌더 중 ref 변이는 concurrent mode에서 위험)
  const classified = useMemo(() => classifySymbols(symbols), [symbols]);
  // queryFn에서 읽기 위해 ref에도 동기화 (클로저 캡처 문제 방지)
  const classifiedRef = useRef(classified);
  classifiedRef.current = classified;

  const queryClient = useQueryClient();

  // ── 쿼리 반환 타입: prices + marqueeItems를 함께 캐싱 ──
  interface CycleResult {
    prices: Record<string, StockPrice>;
    marqueeItems: MarqueeItem[];
  }

  // ── 국내 쿼리 ──
  const domesticCodes = [...classified.domesticStocks.map(s => s.code), ...classified.domesticIndexFutures.map(s => s.code)].sort();
  const domesticQuery = useQuery<CycleResult>({
    queryKey: ['domestic', domesticCodes],
    queryFn: async () => {
      setProgress(0);
      return await fetchDomesticCycle(classifiedRef.current, setProgress);
    },
    enabled: true,
    retry: false,
    structuralSharing: false,
  });

  // ── 해외 쿼리 ──
  const overseasCodes = [...classified.overseasStocks.map(s => s.code), ...classified.overseasIndexFutures.map(s => s.code)].sort();
  const overseasQuery = useQuery<CycleResult>({
    queryKey: ['overseas', overseasCodes],
    queryFn: async () => {
      return await fetchOverseasCycle(classifiedRef.current);
    },
    enabled: true,
    retry: false,
    structuralSharing: false,
  });

  // 가격 합산
  const prices: Record<string, StockPrice> = {
    ...(domesticQuery.data?.prices || {}),
    ...(overseasQuery.data?.prices || {}),
  };

  // 마퀴 아이템 — 쿼리 캐시에서 직접 파생 (side effect 없음)
  const marqueeItems: MarqueeItem[] = [
    ...(domesticQuery.data?.marqueeItems || []),
    ...(overseasQuery.data?.marqueeItems || []),
  ];

  // ── 자체 타이머 (수동 갱신 시 리셋) ──
  const domesticTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const overseasTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // 타이머는 useEffect에서만 스케줄 — .then() 체인과 동시에 하면 이중 스케줄 버그
  const scheduleDomestic = useCallback(() => {
    clearTimeout(domesticTimerRef.current);
    const delay = refreshIntervalDomestic * 1000 + (Math.random() * 6_000 - 3_000);
    domesticTimerRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['domestic'] });
    }, delay);
  }, [refreshIntervalDomestic, queryClient]);

  const scheduleOverseas = useCallback(() => {
    clearTimeout(overseasTimerRef.current);
    const delay = refreshIntervalOverseas * 1000 + (Math.random() * 10_000 - 5_000);
    overseasTimerRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['overseas'] });
    }, delay);
  }, [refreshIntervalOverseas, queryClient]);

  // fetch 완료 시(isFetching false) 다음 타이머 스케줄 — 유일한 스케줄 경로
  useEffect(() => {
    if (!domesticQuery.isFetching) scheduleDomestic();
    return () => clearTimeout(domesticTimerRef.current);
  }, [domesticQuery.isFetching, scheduleDomestic]);

  useEffect(() => {
    if (!overseasQuery.isFetching) scheduleOverseas();
    return () => clearTimeout(overseasTimerRef.current);
  }, [overseasQuery.isFetching, scheduleOverseas]);

  // 수동 갱신 — 양쪽 다 즉시 + 타이머 리셋
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['domestic'] });
    queryClient.invalidateQueries({ queryKey: ['overseas'] });
  }, [queryClient]);

  const loading = domesticQuery.isLoading || overseasQuery.isLoading;
  const fetching = domesticQuery.isFetching || overseasQuery.isFetching;
  const lastUpdated = domesticQuery.dataUpdatedAt
    ? new Date(Math.max(domesticQuery.dataUpdatedAt, overseasQuery.dataUpdatedAt || 0))
    : null;

  return {
    prices,
    marqueeItems,
    loading,
    fetching,
    lastUpdated,
    refresh,
    progressRef,
    subscribeProgress: useCallback((fn: () => void) => {
      listenersRef.current.add(fn);
      return () => { listenersRef.current.delete(fn); };
    }, []),
  };
};
