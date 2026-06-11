import { useRef, useCallback, useEffect, useMemo, useState } from 'react';
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
import { fetchYahooExtended, applyYahooExtended, selectDaymarketTargets, withDaymarketSentinel, DM_SENTINEL, type ExtendedQuote } from '@/shared/yahoo';

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
): Promise<{ prices: Record<string, StockPrice>; marqueeItems: MarqueeItem[]; daymarketLive?: boolean }> => {
  const prices: Record<string, StockPrice> = {};
  const marqueeItems: MarqueeItem[] = [];
  let daymarketLive = false;

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

  // 1-b. 데이마켓 후보(CLOSED/OVERNIGHT US 전부) → 야후 오버나잇(데이마켓) 실시간가 병합. (네이버 미제공 = 오버나잇만, WS 스트리머)
  //     가격/등락/상태만 야후, 나머지는 네이버 그대로. 야후 미수신/stale 종목은 네이버 값 유지(fallback).
  //     타겟 선정은 selectDaymarketTargets 단일 기준(15초 fast·부트스트랩과 동일) — 경로 간 기준이 다르면
  //     구독/해지 churn 발생. hasExtendedHours로 좁히지 않는 이유는 selectDaymarketTargets 주석 참조(깜빡임 사고).
  const dmTargets = selectDaymarketTargets(overseasStocks, prices);
  if (dmTargets.length > 0) {
    // 센티널(QQQ) 동승 — 오버나잇 응답이 1건이라도 있으면(센티널 포함) 데이마켓 세션 라이브 확정
    const ext = await fetchYahooExtended(withDaymarketSentinel(dmTargets));
    Object.assign(prices, applyYahooExtended(prices, ext));
    daymarketLive = Object.keys(ext).length > 0;
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

  return { prices, marqueeItems, daymarketLive };
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
  /** US 데이마켓 후보는 있으나 아직 라이브 데이터 없음 = WS 연결 중. App 토스트 안내용 (owner만 true). */
  daymarketConnecting: boolean;
}

export const useDataPolling = (
  symbols: StockSymbol[],
  refreshIntervalDomestic: number,
  refreshIntervalOverseas: number,
  // 데이마켓 fast 갱신 소유 여부. useDataPolling은 App.tsx + StockViewSwitch 두 곳에서 실행되는데
  // 네이버 사이클은 React Query가 같은 queryKey로 dedup하지만, 데이마켓 효과는 useEffect 직접 호출이라
  // dedup 안 됨 → 두 인스턴스 중 App(루트, 항상 마운트)만 소유. 나머지는 공유 캐시를 읽기만.
  ownsDaymarketRefresh = false,
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
    /** 데이마켓 세션 라이브 확인됨(센티널/사용자 종목 오버나잇 수신) — '연결중' 게이트 공유용 */
    daymarketLive?: boolean;
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

  // 마퀴 아이템 — 쿼리 캐시에서 직접 파생 (side effect 없음).
  // useMemo: 데이마켓 fast 갱신이 setQueryData(overseas)로 prices만 바꿔도 marqueeItems 참조는 보존됨
  // (`{...old, prices}`라 old.marqueeItems 그대로) → 동일 내용 새 배열로 MarqueeTicker 헛 리렌더 방지.
  const marqueeItems = useMemo<MarqueeItem[]>(() => [
    ...(domesticQuery.data?.marqueeItems || []),
    ...(overseasQuery.data?.marqueeItems || []),
  ], [domesticQuery.data?.marqueeItems, overseasQuery.data?.marqueeItems]);

  // 데이마켓 fast 갱신용 — 콜백에서 최신값 읽기 위한 ref (의존성에서 빼 타이머 reshuffle 방지)
  const overseasPricesRef = useRef(overseasQuery.data?.prices);
  overseasPricesRef.current = overseasQuery.data?.prices;
  const overseasCodesRef = useRef(overseasCodes);
  overseasCodesRef.current = overseasCodes;
  const overseasCodesKey = overseasCodes.join(',');   // 종목 구성 변경 감지용 안정 키(상태 flip엔 불변)
  const bootstrapActiveRef = useRef(false);           // 데이마켓 부트스트랩 진행 중 → 국내사이클 머지 보류

  // 야후 응답을 overseas 캐시에 머지 — fast 갱신·부트스트랩 공용.
  // no-op 가드: 센티널만 왔고(사용자 종목 0) 라이브 플래그도 이미 참이면 old 그대로 반환
  //  → React Query가 알림 자체를 스킵(무의미한 컨테이너 재생성·리렌더 방지, 전 종목 저유동 시 무한 no-op write 차단).
  const mergeDaymarketExt = useCallback((ext: Record<string, ExtendedQuote>) => {
    if (Object.keys(ext).length === 0) return;   // 미수신 = 네이버 값 유지
    const hasUserCode = Object.keys(ext).some(c => c !== DM_SENTINEL.code);
    queryClient.setQueryData<CycleResult>(['overseas', overseasCodesRef.current], (old) => {
      if (!old) return old;
      if (!hasUserCode && old.daymarketLive) return old;
      return { ...old, prices: applyYahooExtended(old.prices, ext), daymarketLive: true };
    });
  }, [queryClient]);

  // 데이마켓(OVERNIGHT/CLOSED US) 갱신 — 야후 캐시 읽어 overseas 캐시에 머지(신선한 종목 한 번에 일괄).
  // 국내 사이클 완료 시점에 호출 → 국내 종목과 위상 맞춰 같이 flash. refs로 최신값 읽어 안정 참조 유지.
  // 센티널(QQQ) 동승: 오버나잇 응답 1건+(센티널 포함) = 세션 라이브 → daymarketLive 갱신('연결중' 게이트).
  const runDaymarketRefresh = useCallback(async (shouldAbort: () => boolean): Promise<void> => {
    const targets = selectDaymarketTargets(classifiedRef.current.overseasStocks, overseasPricesRef.current);
    if (targets.length === 0) return;
    const ext = await fetchYahooExtended(withDaymarketSentinel(targets), true);   // silentWhenEmpty — 연결 중/주말 0건 로그 소음 방지
    if (shouldAbort()) return;
    mergeDaymarketExt(ext);
  }, [mergeDaymarketExt]);

  // ── 자체 타이머 (수동 갱신 시 리셋) ──
  const domesticTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const overseasTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // 타이머는 useEffect에서만 스케줄 — .then() 체인과 동시에 하면 이중 스케줄 버그
  const scheduleDomestic = useCallback(() => {
    clearTimeout(domesticTimerRef.current);
    const base = refreshIntervalDomestic * 1000;
    const delay = base * (0.8 + Math.random() * 0.4); // ±20% jitter
    domesticTimerRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['domestic'] });
    }, delay);
  }, [refreshIntervalDomestic, queryClient]);

  const scheduleOverseas = useCallback(() => {
    clearTimeout(overseasTimerRef.current);
    const base = refreshIntervalOverseas * 1000;
    const delay = Math.max(base * (0.8 + Math.random() * 0.4), 70_000); // ±20% jitter, 서버 권장 70초 하한
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

  // ── 데이마켓 갱신 — 정상상태(국내 사이클 동기) ──
  // 정착 후 유지: 국내 사이클(15초)마다 신선 종목 일괄 머지 → 국내와 위상 맞춰 같이 flash.
  // 부트스트랩 진행 중엔 건너뜀(부트스트랩이 한꺼번에 공개하므로 트리클 방지).
  useEffect(() => {
    if (!ownsDaymarketRefresh) return;          // 단일 소유자(App)만 — 중복 호출/로그 방지
    if (!domesticQuery.dataUpdatedAt) return;   // 국내 사이클 완료 시점에만 발사
    if (bootstrapActiveRef.current) return;     // 부트스트랩 중 → 보류(트리클 방지)
    let cancelled = false;
    void runDaymarketRefresh(() => cancelled);
    return () => { cancelled = true; };
  }, [ownsDaymarketRefresh, domesticQuery.dataUpdatedAt, runDaymarketRefresh]);

  // ── 데이마켓 부트스트랩 — 마운트/종목추가 시 빠른 로딩 (준비되는 대로 즉시 공개) ──
  // 렌더러는 WS 연결 시점을 모름 → 2초 간격으로 야후 캐시를 빠르게 확인(재시도 포함).
  //  · 아직 CLOSED('연결중')인 종목*만* 조회·머지 — 이미 '데이' 전환된 종목은 건드리지 않음
  //    (전체 타겟을 매 틱 머지하면 라이브 종목이 2초마다 새 객체 → flash 폭격. 라이브 갱신은 15초 사이클 몫.)
  //  · 신선해진 종목은 *즉시* 공개(as-ready) → '장마감' 안 거치고 바로 '데이'.
  //  · ~14초까지 안 오는 종목(저유동 등)은 부트스트랩 종료 후 15초 사이클이 이어받음('연결중' 유지는 세션 기반).
  //  · 종목 구성(overseasCodesKey) 바뀔 때만 재가동 — 상태 flip엔 재가동 안 함(straggler 무한 재시작 방지).
  useEffect(() => {
    if (!ownsDaymarketRefresh) return;
    const MAX_ATTEMPTS = 7;        // ~14초 (7 × 2초) — 이후는 15초 정상 사이클이 담당
    const INTERVAL_MS = 2_000;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const tick = async () => {
      if (cancelled) return;
      const prices = overseasPricesRef.current;
      if (prices) {
        const targets = selectDaymarketTargets(classifiedRef.current.overseasStocks, prices);
        const pendingTargets = targets.filter(t => prices[t.code]?.marketStatus === 'CLOSED');
        if (pendingTargets.length === 0) { bootstrapActiveRef.current = false; return; }   // 펜딩 없음 → 종료
        bootstrapActiveRef.current = true;     // 국내사이클 머지 보류(부트스트랩이 더 자주 머지)
        const ext = await fetchYahooExtended(withDaymarketSentinel(pendingTargets), true);   // 연결중 종목만 + 센티널
        if (cancelled) return;
        mergeDaymarketExt(ext);                // 준비된 종목 즉시 공개(as-ready) + 세션 라이브 플래그 (no-op 가드 공유)
        if (!pendingTargets.some(t => !ext[t.code])) { bootstrapActiveRef.current = false; return; }   // 전부 로딩 → 종료
      }
      attempts++;
      if (attempts >= MAX_ATTEMPTS) { bootstrapActiveRef.current = false; return; }   // 이후 15초 사이클이 이어받음
      timer = setTimeout(tick, INTERVAL_MS);
    };
    void tick();
    return () => { cancelled = true; clearTimeout(timer); bootstrapActiveRef.current = false; };
  }, [ownsDaymarketRefresh, overseasCodesKey, mergeDaymarketExt]);

  // 데이마켓 '연결중' 게이트 — 연결 시도 대상(US+시간외지원+CLOSED)은 시도 시작부터 바로 펄스.
  //  · 시도 창(8초): 마운트/종목추가 직후부터 펄스 → '장마감→데이' 점프 없이 '연결중→데이' 순서 보장.
  //    창은 첫 센티널 확인(~2-4초)까지의 공백만 메우면 됨.
  //  · 창 이후엔 시그널 기반(임의 타임아웃 X): 세션 라이브 = 누가 OVERNIGHT(dmAnyLive) OR 센티널 QQQ 틱 수신
  //    (daymarketLive, 공유 캐시) → 전 종목이 저유동이어도 데이터 올 때까지 '연결중' 유지(장마감 깜빡임 없음).
  //  · 주말/완전마감: 센티널도 침묵 → 창 8초 깜빡 후 '장마감' 정착. 미지원(SQLT)은 처음부터 제외.
  //  · 양 인스턴스(App/StockViewSwitch)가 동일 파생 로직 — daymarketLive는 공유 쿼리 캐시라 동기.
  const dmTargets = selectDaymarketTargets(classified.overseasStocks, overseasQuery.data?.prices);
  const dmPrices = overseasQuery.data?.prices;
  const dmAnyLive = dmTargets.some(t => dmPrices?.[t.code]?.marketStatus === 'OVERNIGHT');
  const dmSessionLive = overseasQuery.data?.daymarketLive === true;
  const [dmTryWindowOver, setDmTryWindowOver] = useState(false);
  useEffect(() => {
    setDmTryWindowOver(false);                                // 종목 구성 변경 → 시도 창 재시작
    const t = setTimeout(() => setDmTryWindowOver(true), 8_000);
    return () => clearTimeout(t);
  }, [overseasCodesKey]);
  const daymarketConnecting = dmAnyLive || dmSessionLive || !dmTryWindowOver;

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
    daymarketConnecting,
  };
};
