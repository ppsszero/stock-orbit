import { useRef, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StockPrice, StockSymbol, inferCategory } from '@/shared/types';
import { fetchDomesticStock, fetchOverseasStock, fetchDomesticIndex, fetchOverseasIndex, fetchOverseasFutures } from '@/shared/naver';

/** 한 배치당 요청 수 */
const BATCH_SIZE = 10;
/**
 * 배치 사이의 지연 (ms) — 병렬 폭주 방지용 최소 간격.
 * 너무 길면 전체 사이클이 늘어지고(→ 마지막 배치 종목의 최신성 저하),
 * 너무 짧으면 네이버 서버에 스파이크 부담. 3초가 실측 기준 현실적 절충점.
 */
const BATCH_DELAY_MS = 3_000;
/** 이 수 이하면 배치 없이 한 번에 요청 */
const BATCH_THRESHOLD = 10;

const fetchOne = (sym: StockSymbol): Promise<StockPrice | null> => {
  const category = inferCategory(sym);

  // 지수/선물은 별도 API 사용 (주식 API로 호출 시 앱 깨짐)
  // nation 대신 code/reutersCode 패턴으로 국내/해외 판별
  // (자동완성 API가 'KOR'을 안 줄 때 대비, code="IXIC"인데 reutersCode=".IXIC"인 경우도 처리)
  if (category === 'index' || category === 'futures') {
    const c = sym.code.toUpperCase();
    const rc = (sym.reutersCode || '').toUpperCase();
    // 해외 지수: . 접두사 (.IXIC, .DJI, .NDX 등)
    if (c.startsWith('.') || rc.startsWith('.')) return fetchOverseasIndex(sym.reutersCode || sym.code);
    // 해외 선물: CV{숫자} 패턴 (NQcv1, ESv1 등)
    if (/CV\d+$/i.test(c) || /CV\d+$/i.test(rc)) return fetchOverseasFutures(sym.reutersCode || sym.code);
    // 그 외 = 국내 지수/선물 (KOSPI, KOSDAQ, KPI100, KPI200, FUT 등)
    return fetchDomesticIndex(sym.code);
  }
  // 일반 주식
  return sym.nation === 'KR'
    ? fetchDomesticStock(sym.code)
    : fetchOverseasStock(sym.reutersCode || sym.code);
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * 종목 수가 많으면 10개씩 쪼개서 3초 간격으로 병렬 요청 전송.
 * onProgress 콜백으로 배치 진행률(0~1)을 실시간 보고.
 */
const fetchInBatches = async (
  symbols: StockSymbol[],
  onProgress?: (ratio: number) => void,
): Promise<Record<string, StockPrice>> => {
  const out: Record<string, StockPrice> = {};
  if (symbols.length === 0) return out;

  const runBatch = async (batch: StockSymbol[]) => {
    const results = await Promise.allSettled(batch.map(fetchOne));
    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value) out[batch[i].code] = r.value;
    });
  };

  if (symbols.length === 0) { onProgress?.(1); return out; }

  if (symbols.length <= BATCH_THRESHOLD) {
    onProgress?.(0.5);
    await runBatch(symbols);
    onProgress?.(1);
    return out;
  }

  const total = Math.ceil(symbols.length / BATCH_SIZE);
  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, i + BATCH_SIZE);
    await runBatch(batch);
    const done = Math.floor(i / BATCH_SIZE) + 1;
    onProgress?.(done / total);
    if (i + BATCH_SIZE < symbols.length) await sleep(BATCH_DELAY_MS);
  }
  return out;
};

/**
 * 종목별 실시간 가격 폴링.
 * 30초 기본 주기 + ±5초 지터로 서버 부하 스파이크 방지.
 * progress(0~1)를 반환하여 UI에서 진행 상황을 표시할 수 있음.
 */
export const useStockPrices = (symbols: StockSymbol[], refreshInterval: number) => {
  // progress를 ref로 관리 — setState로 하면 queryFn 안에서 리렌더 폭풍
  // 외부에서 구독할 수 있도록 콜백 패턴 사용
  const progressRef = useRef(0);
  const listenersRef = useRef<Set<() => void>>(new Set());

  const setProgress = useCallback((v: number) => {
    progressRef.current = v;
    listenersRef.current.forEach(fn => fn());
  }, []);

  // 언마운트 시 리스너 정리
  useEffect(() => () => { listenersRef.current.clear(); }, []);

  const { data: prices = {}, isLoading, isFetching, dataUpdatedAt, refetch } = useQuery({
    queryKey: ['stockPrices', symbols.map(s => s.code).sort()],
    queryFn: () => {
      setProgress(0);
      return fetchInBatches(symbols, setProgress);
    },
    // jitter: ±5초 랜덤 오프셋으로 여러 사용자 동시 요청 분산
    refetchInterval: () => refreshInterval * 1000 + (Math.random() * 10_000 - 5_000),
    enabled: symbols.length > 0,
    // naver.ts의 rate-limit 백오프가 재시도를 이미 지연 처리하므로
    // React Query 자동 재시도를 꺼서 중복 요청과 backoff 충돌을 방지
    retry: false,
    // 매 fetch마다 새 객체 참조 보장 → usePriceFlash가 갱신 감지 가능
    structuralSharing: false,
  });

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;
  return {
    prices,
    loading: isLoading,
    fetching: isFetching,
    lastUpdated,
    refresh: refetch,
    /** progress ref + subscribe — StatusBar에서 useSyncExternalStore로 구독 */
    progressRef,
    subscribeProgress: useCallback((fn: () => void) => {
      listenersRef.current.add(fn);
      return () => { listenersRef.current.delete(fn); };
    }, []),
  };
};
